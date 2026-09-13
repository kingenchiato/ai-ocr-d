export type DocType =
  | 'invoice'
  | 'bank_statement'
  | 'bank_passbook'
  | 'bank_screenshot'
  | 'bank_csv'
  | 'purchase_order'
  | 'trade_evidence'
  | 'unknown'

export type AlertSeverity = 'info' | 'watch' | 'critical'
export type CaseStatus = 'watching' | 'ready' | 'parsing' | 'review' | 'done'
export type ParseQuality = 'good' | 'partial' | 'failed'

export interface DriveFileMeta {
  fileId: string
  name: string
  mime: string
  modifiedAt: string
  sizeKb: number
  pages?: number
}

export interface ExtractedField {
  key: string
  label: string
  value: string
  confidence: number
}

export interface ReviewAlert {
  id: string
  severity: AlertSeverity
  code: string
  message: string
  /** Always framed as human review — never definitive fraud */
  action: '要確認'
}

export interface BankTxn {
  date: string
  counterparty: string
  deposit: number | null
  withdrawal: number | null
  balance: number | null
}

export interface BankSnapshot {
  bankName: string
  accountHolder: string
  accountNoMasked: string
  periodStart: string
  periodEnd: string
  openingBalance: number
  closingBalance: number
  pageOrder: number[]
  transactions: BankTxn[]
  missingRanges: string[]
}

export interface ParsedDocument {
  id: string
  file: DriveFileMeta
  docType: DocType
  quality: ParseQuality
  fields: ExtractedField[]
  alerts: ReviewAlert[]
  bank?: BankSnapshot
  rawTextPreview: string
}

export interface CrossCheck {
  id: string
  label: string
  status: 'match' | 'mismatch' | 'incomplete'
  detail: string
}

export interface BankCompareResult {
  accountChanged: boolean
  holderChanged: boolean
  periodOverlap: string | null
  gapDays: number
  openingDiff: number | null
  closingDiff: number | null
  pageOrderIssue: boolean
  duplicatePages: number[]
  foreignAccountHint: boolean
  notes: ReviewAlert[]
}

export interface NotificationLog {
  id: string
  sentAt: string
  to: string
  subject: string
  body: string
}

export interface ApplicationCase {
  id: string
  applicant: string
  business: string
  driveFolderId: string
  driveFolderName: string
  status: CaseStatus
  lastSyncAt: string
  settleWaitUntil: string | null
  documents: ParsedDocument[]
  previousBank?: BankSnapshot
  crossChecks: CrossCheck[]
  bankCompare?: BankCompareResult
  notifications: NotificationLog[]
  processedFileIds: Record<string, string>
}
