import type { ApplicationCase, BankSnapshot, ParsedDocument } from './types'

const prevBankA: BankSnapshot = {
  bankName: 'みずほ銀行',
  accountHolder: '合同会社アオイ商事',
  accountNoMasked: '****4521',
  periodStart: '2025-10-01',
  periodEnd: '2025-12-31',
  openingBalance: 1_842_300,
  closingBalance: 2_105_880,
  pageOrder: [1, 2, 3, 4],
  missingRanges: [],
  transactions: [
    { date: '2025-10-03', counterparty: '㈱北関東ロジ', deposit: 480_000, withdrawal: null, balance: 2_322_300 },
    { date: '2025-11-12', counterparty: '家賃振替', deposit: null, withdrawal: 220_000, balance: 1_980_100 },
    { date: '2025-12-28', counterparty: '㈱北関東ロジ', deposit: 510_000, withdrawal: null, balance: 2_105_880 },
  ],
}

const currBankA: BankSnapshot = {
  bankName: 'みずほ銀行',
  accountHolder: '合同会社アオイ商事',
  accountNoMasked: '****4521',
  periodStart: '2026-01-01',
  periodEnd: '2026-03-15',
  openingBalance: 2_105_880,
  closingBalance: 1_672_440,
  pageOrder: [1, 2, 4, 3],
  missingRanges: ['2026-02-08〜2026-02-14'],
  transactions: [
    { date: '2026-01-09', counterparty: '㈱北関東ロジ', deposit: 495_000, withdrawal: null, balance: 2_600_880 },
    { date: '2026-01-20', counterparty: '仕入 / 山田部品', deposit: null, withdrawal: 318_000, balance: 2_282_880 },
    { date: '2026-02-18', counterparty: '家賃振替', deposit: null, withdrawal: 220_000, balance: 1_890_200 },
    { date: '2026-03-10', counterparty: '三井住友カード', deposit: null, withdrawal: 217_760, balance: 1_672_440 },
  ],
}

const prevBankB: BankSnapshot = {
  bankName: '三菱UFJ銀行',
  accountHolder: '個人事業 佐藤健',
  accountNoMasked: '****8810',
  periodStart: '2025-11-01',
  periodEnd: '2026-01-31',
  openingBalance: 420_500,
  closingBalance: 388_200,
  pageOrder: [1, 2],
  missingRanges: [],
  transactions: [
    { date: '2025-11-15', counterparty: '売上入金', deposit: 180_000, withdrawal: null, balance: 600_500 },
    { date: '2026-01-28', counterparty: '消耗品', deposit: null, withdrawal: 42_300, balance: 388_200 },
  ],
}

const currBankB: BankSnapshot = {
  bankName: '三菱UFJ銀行',
  accountHolder: '個人事業 佐藤健',
  accountNoMasked: '****2299',
  periodStart: '2026-02-01',
  periodEnd: '2026-03-20',
  openingBalance: 510_000,
  closingBalance: 640_800,
  pageOrder: [1, 1, 2],
  missingRanges: [],
  transactions: [
    { date: '2026-02-05', counterparty: '別名義? 入金', deposit: 200_000, withdrawal: null, balance: 710_000 },
    { date: '2026-03-01', counterparty: '材料費', deposit: null, withdrawal: 69_200, balance: 640_800 },
  ],
}

function invoiceDoc(): ParsedDocument {
  return {
    id: 'doc-inv-01',
    file: {
      fileId: 'gdrive_f_inv_8841',
      name: '請求書_北関東ロジ_202603.pdf',
      mime: 'application/pdf',
      modifiedAt: '2026-03-18T09:12:00+09:00',
      sizeKb: 412,
      pages: 1,
    },
    docType: 'invoice',
    quality: 'good',
    fields: [
      { key: 'issuer', label: '請求元', value: '株式会社北関東ロジスティクス', confidence: 0.96 },
      { key: 'billedTo', label: '請求先', value: '合同会社アオイ商事', confidence: 0.94 },
      { key: 'amount', label: '金額（税込）', value: '¥495,000', confidence: 0.97 },
      { key: 'issueDate', label: '発行日', value: '2026-03-01', confidence: 0.93 },
      { key: 'dueDate', label: '支払期日', value: '2026-03-31', confidence: 0.91 },
      { key: 'bankTransfer', label: '振込先', value: 'みずほ銀行 高崎支店 普通 ****7782', confidence: 0.88 },
    ],
    alerts: [],
    rawTextPreview: '請求書\n株式会社北関東ロジスティクス\n御中 合同会社アオイ商事\nご請求金額 ¥495,000 …',
  }
}

function purchaseOrderDoc(): ParsedDocument {
  return {
    id: 'doc-po-01',
    file: {
      fileId: 'gdrive_f_po_2201',
      name: '注文書_アオイ_202602.jpg',
      mime: 'image/jpeg',
      modifiedAt: '2026-03-18T09:14:20+09:00',
      sizeKb: 1_280,
      pages: 1,
    },
    docType: 'purchase_order',
    quality: 'partial',
    fields: [
      { key: 'buyer', label: '発注元', value: '合同会社アオイ商事', confidence: 0.9 },
      { key: 'seller', label: '発注先', value: '株式会社北関東ロジスティクス', confidence: 0.86 },
      { key: 'amount', label: '発注金額', value: '¥450,000', confidence: 0.72 },
      { key: 'orderDate', label: '発注日', value: '2026-02-20', confidence: 0.84 },
    ],
    alerts: [
      {
        id: 'a1',
        severity: 'watch',
        code: 'LOW_CONFIDENCE_AMOUNT',
        message: '注文書の金額欄に影があり、信頼度が低下しています（0.72）。',
        action: '要確認',
      },
      {
        id: 'a2',
        severity: 'watch',
        code: 'AMOUNT_GAP',
        message: '請求書金額（¥495,000）と発注金額（¥450,000）に差異があります。',
        action: '要確認',
      },
    ],
    rawTextPreview: '注文書 / 影のあるスマホ撮影画像 / 金額付近のコントラスト低下…',
  }
}

function bankPdfDoc(bank: BankSnapshot): ParsedDocument {
  return {
    id: 'doc-bank-01',
    file: {
      fileId: 'gdrive_f_bank_9910',
      name: '通帳明細_2026Q1.pdf',
      mime: 'application/pdf',
      modifiedAt: '2026-03-18T09:18:44+09:00',
      sizeKb: 2_040,
      pages: 4,
    },
    docType: 'bank_statement',
    quality: 'partial',
    fields: [
      { key: 'bankName', label: '銀行名', value: bank.bankName, confidence: 0.95 },
      { key: 'holder', label: '口座名義', value: bank.accountHolder, confidence: 0.93 },
      { key: 'account', label: '口座番号', value: bank.accountNoMasked, confidence: 0.9 },
      { key: 'period', label: '取引期間', value: `${bank.periodStart} 〜 ${bank.periodEnd}`, confidence: 0.92 },
      { key: 'open', label: '開始残高', value: `¥${bank.openingBalance.toLocaleString('ja-JP')}`, confidence: 0.89 },
      { key: 'close', label: '最終残高', value: `¥${bank.closingBalance.toLocaleString('ja-JP')}`, confidence: 0.91 },
    ],
    alerts: [
      {
        id: 'b1',
        severity: 'watch',
        code: 'PAGE_ORDER',
        message: 'ページ順序が 1→2→4→3 と検出されました。スキャン順序の乱れの可能性があります。',
        action: '要確認',
      },
      {
        id: 'b2',
        severity: 'watch',
        code: 'GAP_PERIOD',
        message: `欠落期間の疑い: ${bank.missingRanges.join(', ') || 'なし'}`,
        action: '要確認',
      },
    ],
    bank,
    rawTextPreview: '普通預金明細… みずほ銀行 … 残高・入出金テーブル抽出',
  }
}

function evidenceDoc(): ParsedDocument {
  return {
    id: 'doc-ev-01',
    file: {
      fileId: 'gdrive_f_line_441',
      name: '取引証拠_LINEスクショ.png',
      mime: 'image/png',
      modifiedAt: '2026-03-18T09:20:01+09:00',
      sizeKb: 890,
      pages: 1,
    },
    docType: 'trade_evidence',
    quality: 'good',
    fields: [
      { key: 'channel', label: 'チャネル', value: 'LINE', confidence: 0.98 },
      { key: 'counterpart', label: '相手', value: '北関東ロジ 担当:田村', confidence: 0.87 },
      { key: 'topic', label: '内容要約', value: '3月分配送費の請求確認・振込予定日の合意', confidence: 0.81 },
      { key: 'date', label: 'やり取り日', value: '2026-03-02', confidence: 0.9 },
    ],
    alerts: [
      {
        id: 'e1',
        severity: 'info',
        code: 'EVIDENCE_ALIGNED',
        message: '請求書の相手先・時期と取引証拠の内容は概ね整合しています。',
        action: '要確認',
      },
    ],
    rawTextPreview: 'LINEトーク: 請求書送ります / 31日振込でお願いします…',
  }
}

function blurryCsvDoc(): ParsedDocument {
  return {
    id: 'doc-csv-01',
    file: {
      fileId: 'gdrive_f_csv_110',
      name: 'ネットバンキング_書出.csv',
      mime: 'text/csv',
      modifiedAt: '2026-03-19T11:02:00+09:00',
      sizeKb: 64,
    },
    docType: 'bank_csv',
    quality: 'good',
    fields: [
      { key: 'rows', label: '取引行数', value: '48', confidence: 0.99 },
      { key: 'period', label: 'CSV期間', value: '2026-01-01 〜 2026-03-15', confidence: 0.98 },
    ],
    alerts: [],
    rawTextPreview: '日付,摘要,出金,入金,残高…',
  }
}

export const initialCases: ApplicationCase[] = [
  {
    id: 'case-aoi',
    applicant: '合同会社アオイ商事',
    business: '物流・卸売',
    driveFolderId: 'folder_aoi_202603',
    driveFolderName: '申込_AOI-260318',
    status: 'review',
    lastSyncAt: '2026-03-19T08:40:00+09:00',
    settleWaitUntil: null,
    documents: [invoiceDoc(), purchaseOrderDoc(), bankPdfDoc(currBankA), evidenceDoc(), blurryCsvDoc()],
    previousBank: prevBankA,
    crossChecks: [
      {
        id: 'c1',
        label: '請求書 ↔ 発注書（相手先）',
        status: 'match',
        detail: '請求元と発注先が一致しています。',
      },
      {
        id: 'c2',
        label: '請求書 ↔ 発注書（金額）',
        status: 'mismatch',
        detail: '¥495,000 vs ¥450,000（+¥45,000）。税差額・追加費用の可能性。',
      },
      {
        id: 'c3',
        label: '請求書 ↔ 取引証拠',
        status: 'match',
        detail: '相手・時期・支払期日の言及が整合。',
      },
      {
        id: 'c4',
        label: '銀行明細 ↔ 請求入金',
        status: 'incomplete',
        detail: '明細期間内に該当入金は確認できますが、摘要の完全一致は未確定。',
      },
    ],
    bankCompare: {
      accountChanged: false,
      holderChanged: false,
      periodOverlap: null,
      gapDays: 0,
      openingDiff: 0,
      closingDiff: -433_440,
      pageOrderIssue: true,
      duplicatePages: [],
      foreignAccountHint: false,
      notes: [
        {
          id: 'cmp1',
          severity: 'info',
          code: 'BALANCE_CONTINUITY',
          message: '前回最終残高と今回開始残高は一致しています。',
          action: '要確認',
        },
        {
          id: 'cmp2',
          severity: 'watch',
          code: 'PAGE_ORDER',
          message: '今回提出のページ順序に乱れがあります。',
          action: '要確認',
        },
        {
          id: 'cmp3',
          severity: 'watch',
          code: 'GAP_PERIOD',
          message: '2/8〜2/14 の取引が欠落している可能性があります。',
          action: '要確認',
        },
      ],
    },
    notifications: [
      {
        id: 'n1',
        sentAt: '2026-03-18T09:25:00+09:00',
        to: 'reviewer@example.co.jp',
        subject: '[VerifyDesk] 解析完了: 合同会社アオイ商事',
        body: '新規書類5件の解析が完了しました。要確認アラート 4件。',
      },
    ],
    processedFileIds: {
      gdrive_f_inv_8841: '2026-03-18T09:12:00+09:00',
      gdrive_f_po_2201: '2026-03-18T09:14:20+09:00',
      gdrive_f_bank_9910: '2026-03-18T09:18:44+09:00',
      gdrive_f_line_441: '2026-03-18T09:20:01+09:00',
      gdrive_f_csv_110: '2026-03-19T11:02:00+09:00',
    },
  },
  {
    id: 'case-sato',
    applicant: '佐藤 健（個人事業）',
    business: '内装工事',
    driveFolderId: 'folder_sato_202603',
    driveFolderName: '申込_SATO-260320',
    status: 'ready',
    lastSyncAt: '2026-03-20T07:15:00+09:00',
    settleWaitUntil: null,
    documents: [
      {
        id: 'doc-bank-sato',
        file: {
          fileId: 'gdrive_f_sato_bank',
          name: '通帳写真_傾きあり.jpg',
          mime: 'image/jpeg',
          modifiedAt: '2026-03-20T07:10:00+09:00',
          sizeKb: 2_400,
          pages: 3,
        },
        docType: 'bank_passbook',
        quality: 'partial',
        fields: [
          { key: 'bankName', label: '銀行名', value: currBankB.bankName, confidence: 0.84 },
          { key: 'holder', label: '口座名義', value: currBankB.accountHolder, confidence: 0.8 },
          { key: 'account', label: '口座番号', value: currBankB.accountNoMasked, confidence: 0.78 },
          { key: 'period', label: '取引期間', value: `${currBankB.periodStart} 〜 ${currBankB.periodEnd}`, confidence: 0.82 },
        ],
        alerts: [
          {
            id: 's1',
            severity: 'critical',
            code: 'ACCOUNT_CHANGED',
            message: '前回口座（****8810）と今回口座（****2299）が異なります。別口座混入の可能性。',
            action: '要確認',
          },
          {
            id: 's2',
            severity: 'watch',
            code: 'DUPLICATE_PAGE',
            message: 'ページ1が重複して検出されました。',
            action: '要確認',
          },
          {
            id: 's3',
            severity: 'watch',
            code: 'OPENING_MISMATCH',
            message: '前回最終残高と今回開始残高が連続していません。',
            action: '要確認',
          },
          {
            id: 's4',
            severity: 'info',
            code: 'SKEW_IMAGE',
            message: '通帳写真に傾き・影を検出しました。補正後に再読取済み（部分成功）。',
            action: '要確認',
          },
        ],
        bank: currBankB,
        rawTextPreview: '傾いた通帳写真 / deskew適用 / 低解像度ページあり',
      },
      {
        id: 'doc-inv-sato',
        file: {
          fileId: 'gdrive_f_sato_inv',
          name: '請求書_ぼやけ.pdf',
          mime: 'application/pdf',
          modifiedAt: '2026-03-20T07:12:00+09:00',
          sizeKb: 300,
          pages: 1,
        },
        docType: 'invoice',
        quality: 'failed',
        fields: [
          { key: 'issuer', label: '請求元', value: '（読取失敗）', confidence: 0.21 },
          { key: 'amount', label: '金額', value: '（読取失敗）', confidence: 0.18 },
        ],
        alerts: [
          {
            id: 's5',
            severity: 'critical',
            code: 'OCR_FAILED',
            message: '画像PDFが不鮮明で主要項目の抽出に失敗しました。再提出または手入力が必要です。',
            action: '要確認',
          },
        ],
        rawTextPreview: '低解像度スキャン… 文字が潰れており抽出不可',
      },
    ],
    previousBank: prevBankB,
    crossChecks: [
      {
        id: 'sc1',
        label: '請求書項目',
        status: 'incomplete',
        detail: '請求書OCR失敗のため照合をスキップ。',
      },
    ],
    bankCompare: {
      accountChanged: true,
      holderChanged: false,
      periodOverlap: null,
      gapDays: 0,
      openingDiff: 121_800,
      closingDiff: null,
      pageOrderIssue: false,
      duplicatePages: [1],
      foreignAccountHint: true,
      notes: [
        {
          id: 'scmp1',
          severity: 'critical',
          code: 'ACCOUNT_CHANGED',
          message: '口座番号が前回と異なります。別口座混入の可能性としてフラグしています（断定ではありません）。',
          action: '要確認',
        },
        {
          id: 'scmp2',
          severity: 'watch',
          code: 'OPENING_MISMATCH',
          message: '残高連続性を確認できませんでした。',
          action: '要確認',
        },
      ],
    },
    notifications: [],
    processedFileIds: {
      gdrive_f_sato_bank: '2026-03-20T07:10:00+09:00',
      gdrive_f_sato_inv: '2026-03-20T07:12:00+09:00',
    },
  },
  {
    id: 'case-mori',
    applicant: '株式会社モリ製作所',
    business: '金属加工',
    driveFolderId: 'folder_mori_incoming',
    driveFolderName: '申込_MORI-260321',
    status: 'watching',
    lastSyncAt: '2026-03-21T09:01:00+09:00',
    settleWaitUntil: '2026-03-21T09:06:00+09:00',
    documents: [],
    previousBank: undefined,
    crossChecks: [],
    notifications: [],
    processedFileIds: {},
  },
]
