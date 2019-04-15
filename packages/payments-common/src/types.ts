type Nullable<T> = { [P in keyof T]: T[P] | null }

export interface BalanceResult {
  balance: string, // balance with at least 1 confirmation
  unconfirmedBalance: string // balance that is pending confirmation on the blockchain
}

export type TransactionStatus = 'unsigned' | 'signed' | 'pending' | 'confirmed' | 'failed'

interface TransactionCommon {
  id: string | null // txid
  from: string | null // sender address
  to: string | null // recipient address
  toExtraId: string | null // eg Monero payment ID
  fromIndex: number | null // sender address index
  toIndex: number | null // recipient address index, null if not ours
  amount: string | null // main denomination (eg "0.125")
  fee: string | null // total fee in main denomination
  status: TransactionStatus
}

interface UnsignedCommon<Raw> extends TransactionCommon {
  from: string
  to: string
  fromIndex: number
  rawUnsigned: Raw
}

export interface BaseUnsignedTransaction<Raw> extends UnsignedCommon<Raw> {
  status: 'unsigned'
}

export interface BaseSignedTransaction<Raw> extends UnsignedCommon<Raw> {
  status: 'signed'
  id: string
  amount: string
  fee: string
  rawSigned: Raw
}

export interface BaseTransactionInfo<Raw> extends TransactionCommon {
  id: string
  amount: string
  fee: string
  isExecuted: boolean // true if transaction didn't fail (eg TRX/ETH contract succeeded)
  isConfirmed: boolean
  confirmations: number // 0 if not confirmed
  block: number | null // null if not confirmed
  date: Date | null // null if timestamp unavailable
  rawInfo: Raw
}

export interface BroadcastResult {
  id: string
}
