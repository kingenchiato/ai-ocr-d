import type {
  ApplicationCase,
  BankCompareResult,
  BankSnapshot,
  NotificationLog,
  ParsedDocument,
  ReviewAlert,
} from './types'

export const docTypeLabel: Record<string, string> = {
  invoice: '請求書',
  bank_statement: '銀行明細',
  bank_passbook: '通帳写真',
  bank_screenshot: 'ネットバンキング画面',
  bank_csv: '取引CSV',
  purchase_order: '発注書・注文書',
  trade_evidence: '取引証拠',
  unknown: '不明',
}

export const statusLabel: Record<string, string> = {
  watching: 'フォルダ監視中',
  ready: '解析待ち',
  parsing: '解析中',
  review: '担当確認待ち',
  done: '確認済',
}

export function formatYen(n: number): string {
  return `¥${n.toLocaleString('ja-JP')}`
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function countAlerts(docs: ParsedDocument[], extra: ReviewAlert[] = []): number {
  return docs.reduce((n, d) => n + d.alerts.length, 0) + extra.length
}

export function compareBankSnapshots(
  previous: BankSnapshot,
  current: BankSnapshot,
): BankCompareResult {
  const accountChanged = previous.accountNoMasked !== current.accountNoMasked
  const holderChanged = previous.accountHolder !== current.accountHolder
  const openingDiff = current.openingBalance - previous.closingBalance
  const pageOrderIssue = current.pageOrder.some((p, i, arr) => i > 0 && p < arr[i - 1]!)
  const seen = new Set<number>()
  const duplicatePages: number[] = []
  for (const p of current.pageOrder) {
    if (seen.has(p)) duplicatePages.push(p)
    seen.add(p)
  }

  const notes: ReviewAlert[] = []
  if (accountChanged) {
    notes.push({
      id: `gen-acc-${Date.now()}`,
      severity: 'critical',
      code: 'ACCOUNT_CHANGED',
      message: `口座番号が前回(${previous.accountNoMasked})と今回(${current.accountNoMasked})で異なります。`,
      action: '要確認',
    })
  }
  if (Math.abs(openingDiff) > 1) {
    notes.push({
      id: `gen-bal-${Date.now()}`,
      severity: 'watch',
      code: 'OPENING_MISMATCH',
      message: `前回最終残高と今回開始残高の差: ${formatYen(openingDiff)}`,
      action: '要確認',
    })
  } else {
    notes.push({
      id: `gen-ok-${Date.now()}`,
      severity: 'info',
      code: 'BALANCE_CONTINUITY',
      message: '残高の連続性は確認できました。',
      action: '要確認',
    })
  }
  if (pageOrderIssue) {
    notes.push({
      id: `gen-pg-${Date.now()}`,
      severity: 'watch',
      code: 'PAGE_ORDER',
      message: 'ページ順序の乱れを検出しました。',
      action: '要確認',
    })
  }
  if (duplicatePages.length) {
    notes.push({
      id: `gen-dup-${Date.now()}`,
      severity: 'watch',
      code: 'DUPLICATE_PAGE',
      message: `重複ページ: ${duplicatePages.join(', ')}`,
      action: '要確認',
    })
  }
  for (const gap of current.missingRanges) {
    notes.push({
      id: `gen-gap-${gap}`,
      severity: 'watch',
      code: 'GAP_PERIOD',
      message: `欠落期間の疑い: ${gap}`,
      action: '要確認',
    })
  }

  return {
    accountChanged,
    holderChanged,
    periodOverlap: null,
    gapDays: current.missingRanges.length ? 7 : 0,
    openingDiff,
    closingDiff: current.closingBalance - previous.closingBalance,
    pageOrderIssue,
    duplicatePages,
    foreignAccountHint: accountChanged,
    notes,
  }
}

export function buildResultJson(c: ApplicationCase): unknown {
  return {
    caseId: c.id,
    applicant: c.applicant,
    drive: {
      folderId: c.driveFolderId,
      folderName: c.driveFolderName,
      mode: 'read_only',
      processed: Object.entries(c.processedFileIds).map(([fileId, modifiedAt]) => ({
        fileId,
        modifiedAt,
      })),
    },
    documents: c.documents.map((d) => ({
      fileId: d.file.fileId,
      fileName: d.file.name,
      docType: d.docType,
      quality: d.quality,
      fields: Object.fromEntries(d.fields.map((f) => [f.key, { value: f.value, confidence: f.confidence }])),
      alerts: d.alerts.map((a) => ({
        severity: a.severity,
        code: a.code,
        message: a.message,
        action: a.action,
      })),
      bank: d.bank
        ? {
            bankName: d.bank.bankName,
            accountHolder: d.bank.accountHolder,
            accountNoMasked: d.bank.accountNoMasked,
            period: [d.bank.periodStart, d.bank.periodEnd],
            openingBalance: d.bank.openingBalance,
            closingBalance: d.bank.closingBalance,
            pageOrder: d.bank.pageOrder,
            missingRanges: d.bank.missingRanges,
            transactions: d.bank.transactions,
          }
        : null,
    })),
    crossChecks: c.crossChecks,
    bankCompare: c.bankCompare
      ? {
          ...c.bankCompare,
          notes: c.bankCompare.notes.map((n) => ({
            severity: n.severity,
            code: n.code,
            message: n.message,
            action: n.action,
          })),
        }
      : null,
    disclaimer: '本結果は審査支援用の要確認フラグであり、不正の断定・自動承認/否決は行いません。',
  }
}

export function createNotification(c: ApplicationCase): NotificationLog {
  const alertCount = countAlerts(c.documents, c.bankCompare?.notes ?? [])
  return {
    id: `mail-${Date.now()}`,
    sentAt: new Date().toISOString(),
    to: 'reviewer@example.co.jp',
    subject: `[VerifyDesk] 解析完了: ${c.applicant}`,
    body: `${c.driveFolderName} の書類解析が完了しました。書類 ${c.documents.length} 件 / 要確認 ${alertCount} 件。管理画面で内容を確認してください。`,
  }
}

/** Simulate Drive settle + incremental reparse for demo */
export function simulateIncomingFiles(c: ApplicationCase): ApplicationCase {
  if (c.id !== 'case-mori') return c
  const now = new Date().toISOString()
  const newDoc: ParsedDocument = {
    id: `doc-mori-${Date.now()}`,
    file: {
      fileId: `gdrive_f_mori_${Date.now()}`,
      name: '請求書_新規追加.pdf',
      mime: 'application/pdf',
      modifiedAt: now,
      sizeKb: 380,
      pages: 1,
    },
    docType: 'invoice',
    quality: 'good',
    fields: [
      { key: 'issuer', label: '請求元', value: '東北メタル商事株式会社', confidence: 0.95 },
      { key: 'billedTo', label: '請求先', value: '株式会社モリ製作所', confidence: 0.94 },
      { key: 'amount', label: '金額（税込）', value: '¥1,280,000', confidence: 0.96 },
      { key: 'issueDate', label: '発行日', value: '2026-03-18', confidence: 0.92 },
      { key: 'dueDate', label: '支払期日', value: '2026-04-17', confidence: 0.9 },
      { key: 'bankTransfer', label: '振込先', value: 'りそな銀行 大宮支店 普通 ****3301', confidence: 0.88 },
    ],
    alerts: [
      {
        id: `ma-${Date.now()}`,
        severity: 'info',
        code: 'NEW_FILE',
        message: 'Driveフォルダへの追加完了を検知し、待機後に自動解析しました。',
        action: '要確認',
      },
    ],
    rawTextPreview: '請求書 / 東北メタル商事 / ¥1,280,000',
  }

  return {
    ...c,
    status: 'review',
    settleWaitUntil: null,
    lastSyncAt: now,
    documents: [...c.documents, newDoc],
    crossChecks: [
      {
        id: 'mc1',
        label: '請求書必須項目',
        status: 'match',
        detail: '請求元・請求先・金額・期日を抽出済み。',
      },
    ],
    processedFileIds: {
      ...c.processedFileIds,
      [newDoc.file.fileId]: newDoc.file.modifiedAt,
    },
  }
}
