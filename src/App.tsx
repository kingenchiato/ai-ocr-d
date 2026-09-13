import { useEffect, useMemo, useState } from 'react'
import { initialCases } from './data'
import {
  buildResultJson,
  compareBankSnapshots,
  countAlerts,
  createNotification,
  docTypeLabel,
  formatDateTime,
  formatYen,
  simulateIncomingFiles,
  statusLabel,
} from './lib'
import type { ApplicationCase, ParsedDocument } from './types'

type Tab = 'overview' | 'documents' | 'compare' | 'json' | 'notify'

export default function App() {
  const [cases, setCases] = useState<ApplicationCase[]>(initialCases)
  const [selectedId, setSelectedId] = useState(initialCases[0]!.id)
  const [tab, setTab] = useState<Tab>('overview')
  const [docId, setDocId] = useState<string | null>(initialCases[0]!.documents[0]?.id ?? null)
  const [syncPulse, setSyncPulse] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [clock, setClock] = useState(() => new Date())

  const selected = cases.find((c) => c.id === selectedId) ?? cases[0]!

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    setDocId(selected.documents[0]?.id ?? null)
    setTab('overview')
  }, [selectedId])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(t)
  }, [toast])

  const activeDoc: ParsedDocument | null =
    selected.documents.find((d) => d.id === docId) ?? selected.documents[0] ?? null

  const alertTotal = useMemo(
    () => countAlerts(selected.documents, selected.bankCompare?.notes ?? []),
    [selected],
  )

  const jsonText = useMemo(() => JSON.stringify(buildResultJson(selected), null, 2), [selected])

  function showToast(msg: string) {
    setToast(msg)
  }

  function runDriveSync() {
    setSyncPulse(true)
    showToast('Google Drive（読取専用）をポーリング中…')
    window.setTimeout(() => {
      setCases((prev) =>
        prev.map((c) => {
          if (c.id === 'case-mori' && c.status === 'watching') {
            return {
              ...c,
              status: 'ready',
              settleWaitUntil: new Date(Date.now() + 8_000).toISOString(),
              lastSyncAt: new Date().toISOString(),
            }
          }
          return { ...c, lastSyncAt: new Date().toISOString() }
        }),
      )
      setSyncPulse(false)
      showToast('更新を検出。追加完了の安定待機に入りました（デモ: 約8秒）。')
    }, 900)
  }

  useEffect(() => {
    const pending = cases.find((c) => c.id === 'case-mori' && c.status === 'ready' && c.settleWaitUntil)
    if (!pending?.settleWaitUntil) return
    const due = new Date(pending.settleWaitUntil).getTime()
    const wait = Math.max(0, due - Date.now())
    const t = window.setTimeout(() => {
      setCases((prev) =>
        prev.map((c) => {
          if (c.id !== 'case-mori') return c
          const parsed = simulateIncomingFiles({ ...c, status: 'parsing' })
          return parsed
        }),
      )
      showToast('安定待機完了 → 自動解析 → 審査担当向けキューへ移動しました。')
      setSelectedId('case-mori')
      setTab('documents')
    }, wait)
    return () => clearTimeout(t)
  }, [cases])

  function reparseSelected() {
    if (!selected.documents.length) {
      showToast('解析対象の書類がありません。')
      return
    }
    setCases((prev) =>
      prev.map((c) => {
        if (c.id !== selected.id) return c
        const nextDocs = c.documents.map((d) => ({
          ...d,
          file: { ...d.file, modifiedAt: new Date().toISOString() },
        }))
        const bankDoc = nextDocs.find((d) => d.bank)
        const bankCompare =
          c.previousBank && bankDoc?.bank
            ? compareBankSnapshots(c.previousBank, bankDoc.bank)
            : c.bankCompare
        return {
          ...c,
          status: 'review',
          documents: nextDocs,
          bankCompare,
          lastSyncAt: new Date().toISOString(),
          processedFileIds: Object.fromEntries(
            nextDocs.map((d) => [d.file.fileId, d.file.modifiedAt]),
          ),
        }
      }),
    )
    showToast('追加・更新ファイルを再解析し、処理済み fileId / modifiedAt を更新しました。')
  }

  function sendMail() {
    const note = createNotification(selected)
    setCases((prev) =>
      prev.map((c) => (c.id === selected.id ? { ...c, notifications: [note, ...c.notifications] } : c)),
    )
    setTab('notify')
    showToast(`通知メールを送信しました → ${note.to}`)
  }

  function markDone() {
    setCases((prev) =>
      prev.map((c) => (c.id === selected.id ? { ...c, status: 'done' } : c)),
    )
    showToast('確認済としてマークしました。')
  }

  function copyJson() {
    void navigator.clipboard.writeText(jsonText)
    showToast('解析結果JSONをコピーしました。')
  }

  const settleRemaining =
    selected.settleWaitUntil != null
      ? Math.max(0, Math.ceil((new Date(selected.settleWaitUntil).getTime() - clock.getTime()) / 1000))
      : null

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <div>
            <p className="brand-name">VerifyDesk</p>
            <p className="brand-sub">審査書類確認アシスト · Portfolio MVP</p>
          </div>
        </div>
        <div className="top-actions">
          <button type="button" className="btn btn-ghost" onClick={runDriveSync} disabled={syncPulse}>
            {syncPulse ? '同期中…' : 'Drive を検出'}
          </button>
          <button type="button" className="btn btn-primary" onClick={reparseSelected}>
            再解析
          </button>
        </div>
      </header>

      <div className="shell">
        <aside className="queue">
          <div className="queue-head">
            <h1>申込フォルダ</h1>
            <p>読取専用 · fileId / 更新日時で処理済み管理</p>
            <p className="demo-hint">
              デモ操作: 「モリ製作所」選択 → 上部「Drive を検出」で待機〜自動解析を確認
            </p>
          </div>
          <ul className="queue-list">
            {cases.map((c) => {
              const n = countAlerts(c.documents, c.bankCompare?.notes ?? [])
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    className={`queue-item${c.id === selected.id ? ' is-active' : ''}`}
                    onClick={() => setSelectedId(c.id)}
                  >
                    <span className="queue-title">{c.applicant}</span>
                    <span className="queue-meta">{c.driveFolderName}</span>
                    <span className="queue-row">
                      <span className={`pill status-${c.status}`}>{statusLabel[c.status]}</span>
                      {n > 0 ? <span className="pill pill-alert">要確認 {n}</span> : null}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>

        <main className="main">
          <section className="case-hero">
            <div>
              <p className="eyebrow">{selected.business}</p>
              <h2>{selected.applicant}</h2>
              <p className="hero-note">
                Drive: <code>{selected.driveFolderName}</code>
                <span className="dot">·</span>
                最終同期 {formatDateTime(selected.lastSyncAt)}
                {settleRemaining != null && selected.status === 'ready' ? (
                  <>
                    <span className="dot">·</span>
                    安定待機 残り {settleRemaining}s
                  </>
                ) : null}
              </p>
            </div>
            <div className="hero-stats">
              <div>
                <span className="stat-label">書類</span>
                <strong>{selected.documents.length}</strong>
              </div>
              <div>
                <span className="stat-label">要確認</span>
                <strong>{alertTotal}</strong>
              </div>
              <div>
                <span className="stat-label">処理済みID</span>
                <strong>{Object.keys(selected.processedFileIds).length}</strong>
              </div>
            </div>
          </section>

          <nav className="tabs" aria-label="詳細タブ">
            {(
              [
                ['overview', '概要'],
                ['documents', '書類・抽出'],
                ['compare', '前回比較'],
                ['json', 'JSON'],
                ['notify', '通知'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`tab${tab === id ? ' is-active' : ''}`}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </nav>

          {tab === 'overview' && (
            <section className="panel">
              <div className="grid-2">
                <div className="block">
                  <h3>処理方針（デモ実装）</h3>
                  <ol className="steps">
                    <li>Drive フォルダの新規・更新を定期検出（読取専用）</li>
                    <li>追加完了の安定を数分待機してから自動解析</li>
                    <li>追加書類があれば差分再解析</li>
                    <li>結果を管理画面表示 + メール通知</li>
                    <li>AIは不正を断定せず、すべて「要確認」として提示</li>
                  </ol>
                  <div className="action-row">
                    <button type="button" className="btn btn-primary" onClick={sendMail}>
                      担当者へ通知
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={markDone}>
                      確認済にする
                    </button>
                  </div>
                </div>
                <div className="block">
                  <h3>照合サマリー</h3>
                  {selected.crossChecks.length === 0 ? (
                    <p className="empty">まだ照合結果はありません。Drive検出後に生成されます。</p>
                  ) : (
                    <ul className="check-list">
                      {selected.crossChecks.map((x) => (
                        <li key={x.id} className={`check check-${x.status}`}>
                          <span className="check-flag">
                            {x.status === 'match' ? '一致' : x.status === 'mismatch' ? '不一致' : '不足'}
                          </span>
                          <div>
                            <strong>{x.label}</strong>
                            <p>{x.detail}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="block mt">
                <h3>アラート（断定なし）</h3>
                <AlertList
                  items={[
                    ...selected.documents.flatMap((d) => d.alerts),
                    ...(selected.bankCompare?.notes ?? []),
                  ]}
                />
              </div>
            </section>
          )}

          {tab === 'documents' && (
            <section className="panel docs-layout">
              <div className="doc-rail">
                {selected.documents.length === 0 ? (
                  <p className="empty">書類なし。上部の「Drive を検出」で追加完了〜解析デモを実行できます。</p>
                ) : (
                  selected.documents.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      className={`doc-rail-item${activeDoc?.id === d.id ? ' is-active' : ''}`}
                      onClick={() => setDocId(d.id)}
                    >
                      <span className="doc-type">{docTypeLabel[d.docType]}</span>
                      <span className="doc-name">{d.file.name}</span>
                      <span className={`quality q-${d.quality}`}>
                        {d.quality === 'good' ? '良好' : d.quality === 'partial' ? '部分' : '失敗'}
                      </span>
                    </button>
                  ))
                )}
              </div>
              {activeDoc ? (
                <div className="doc-detail">
                  <div className="doc-head">
                    <div>
                      <h3>{docTypeLabel[activeDoc.docType]}</h3>
                      <p>
                        <code>{activeDoc.file.fileId}</code>
                        <span className="dot">·</span>
                        更新 {formatDateTime(activeDoc.file.modifiedAt)}
                        <span className="dot">·</span>
                        {activeDoc.file.sizeKb} KB
                        {activeDoc.file.pages ? ` · ${activeDoc.file.pages}ページ` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="fields">
                    {activeDoc.fields.map((f) => (
                      <div key={f.key} className="field">
                        <span className="field-label">{f.label}</span>
                        <span className="field-value">{f.value}</span>
                        <ConfidenceBar value={f.confidence} />
                      </div>
                    ))}
                  </div>
                  {activeDoc.bank ? (
                    <div className="block mt">
                      <h4>取引サンプル</h4>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>日付</th>
                            <th>相手</th>
                            <th>入金</th>
                            <th>出金</th>
                            <th>残高</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeDoc.bank.transactions.map((t, i) => (
                            <tr key={`${t.date}-${i}`}>
                              <td>{t.date}</td>
                              <td>{t.counterparty}</td>
                              <td>{t.deposit != null ? formatYen(t.deposit) : '—'}</td>
                              <td>{t.withdrawal != null ? formatYen(t.withdrawal) : '—'}</td>
                              <td>{t.balance != null ? formatYen(t.balance) : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                  <div className="block mt">
                    <h4>OCRプレビュー</h4>
                    <pre className="preview">{activeDoc.rawTextPreview}</pre>
                  </div>
                  <div className="block mt">
                    <h4>この書類のアラート</h4>
                    <AlertList items={activeDoc.alerts} />
                  </div>
                </div>
              ) : null}
            </section>
          )}

          {tab === 'compare' && (
            <section className="panel">
              {!selected.previousBank || !selected.bankCompare ? (
                <p className="empty">前回の銀行資料がありません。継続提出ケースで比較デモが有効になります。</p>
              ) : (
                <>
                  <div className="grid-2">
                    <BankCard title="前回提出" bank={selected.previousBank} />
                    <BankCard
                      title="今回提出"
                      bank={
                        selected.documents.find((d) => d.bank)?.bank ?? {
                          ...selected.previousBank,
                          periodStart: '—',
                          periodEnd: '—',
                        }
                      }
                    />
                  </div>
                  <div className="block mt">
                    <h3>比較チェック</h3>
                    <ul className="kv">
                      <li>
                        <span>口座変更</span>
                        <strong>{selected.bankCompare.accountChanged ? 'あり（要確認）' : 'なし'}</strong>
                      </li>
                      <li>
                        <span>名義変更</span>
                        <strong>{selected.bankCompare.holderChanged ? 'あり（要確認）' : 'なし'}</strong>
                      </li>
                      <li>
                        <span>開始残高差</span>
                        <strong>
                          {selected.bankCompare.openingDiff == null
                            ? '—'
                            : formatYen(selected.bankCompare.openingDiff)}
                        </strong>
                      </li>
                      <li>
                        <span>ページ順序</span>
                        <strong>{selected.bankCompare.pageOrderIssue ? '乱れあり' : '正常'}</strong>
                      </li>
                      <li>
                        <span>重複ページ</span>
                        <strong>
                          {selected.bankCompare.duplicatePages.length
                            ? selected.bankCompare.duplicatePages.join(', ')
                            : 'なし'}
                        </strong>
                      </li>
                      <li>
                        <span>別口座混入ヒント</span>
                        <strong>{selected.bankCompare.foreignAccountHint ? '可能性あり' : '低'}</strong>
                      </li>
                    </ul>
                  </div>
                  <div className="block mt">
                    <h3>比較アラート</h3>
                    <AlertList items={selected.bankCompare.notes} />
                  </div>
                </>
              )}
            </section>
          )}

          {tab === 'json' && (
            <section className="panel">
              <div className="json-toolbar">
                <p>解析結果のエクスポート仕様サンプル（本番連携向け）</p>
                <button type="button" className="btn btn-primary" onClick={copyJson}>
                  JSONをコピー
                </button>
              </div>
              <pre className="json-view">{jsonText}</pre>
            </section>
          )}

          {tab === 'notify' && (
            <section className="panel">
              <div className="action-row mb">
                <button type="button" className="btn btn-primary" onClick={sendMail}>
                  メール通知を送る
                </button>
              </div>
              {selected.notifications.length === 0 ? (
                <p className="empty">まだ通知履歴がありません。</p>
              ) : (
                <ul className="mail-list">
                  {selected.notifications.map((n) => (
                    <li key={n.id} className="mail-item">
                      <div className="mail-meta">
                        <strong>{n.subject}</strong>
                        <span>{formatDateTime(n.sentAt)}</span>
                      </div>
                      <p>
                        To: {n.to}
                        <br />
                        {n.body}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </main>
      </div>

      <footer className="footer">
        <p>
          VerifyDesk はポートフォリオ用 MVP です。実 Drive / OCR API は接続していませんが、検出待機・差分再解析・照合・前回比較・JSON・通知の操作フローを再現しています。
        </p>
      </footer>

      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </div>
  )
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  return (
    <div className="conf" title={`信頼度 ${pct}%`}>
      <div className="conf-track">
        <div className="conf-fill" style={{ width: `${pct}%` }} />
      </div>
      <span>{pct}%</span>
    </div>
  )
}

function AlertList({ items }: { items: ApplicationCase['documents'][number]['alerts'] }) {
  if (!items.length) return <p className="empty">アラートはありません。</p>
  return (
    <ul className="alert-list">
      {items.map((a) => (
        <li key={a.id} className={`alert alert-${a.severity}`}>
          <span className="alert-action">{a.action}</span>
          <div>
            <strong>{a.code}</strong>
            <p>{a.message}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

function BankCard({
  title,
  bank,
}: {
  title: string
  bank: NonNullable<ParsedDocument['bank']>
}) {
  return (
    <div className="block bank-card">
      <h3>{title}</h3>
      <ul className="kv compact">
        <li>
          <span>銀行</span>
          <strong>{bank.bankName}</strong>
        </li>
        <li>
          <span>名義</span>
          <strong>{bank.accountHolder}</strong>
        </li>
        <li>
          <span>口座</span>
          <strong>{bank.accountNoMasked}</strong>
        </li>
        <li>
          <span>期間</span>
          <strong>
            {bank.periodStart} 〜 {bank.periodEnd}
          </strong>
        </li>
        <li>
          <span>開始残高</span>
          <strong>{formatYen(bank.openingBalance)}</strong>
        </li>
        <li>
          <span>最終残高</span>
          <strong>{formatYen(bank.closingBalance)}</strong>
        </li>
        <li>
          <span>ページ順</span>
          <strong>{bank.pageOrder.join(' → ')}</strong>
        </li>
      </ul>
    </div>
  )
}
