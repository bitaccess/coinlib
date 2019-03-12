
export interface Balance {
  balance: string, // balance with at least 1 confirmation
  unconfirmedBalance: string // balance that is pending confirmation on the blockchain
}

export type TransactionStatus = 'confirmed' | 'pending' | 'failed'

interface TransactionCommon {
  id: string // txid
  from: string | null // sender address
  to: string | null // recipient address
  toExtraId: string | null // eg Monero payment ID
  fromIndex: number | null // sender address index, null if sender isn't us
  toIndex: number | null // recipient address index, null if recipient isn't us
  amount: string // main denomination (eg "0.125")
  fee: string // total fee in main denomination
  status: TransactionStatus
}

export interface BasePendingTransaction<Raw> extends TransactionCommon {
  status: 'pending'
  raw: Raw
}

export interface BaseTransactionInfo<Raw> extends TransactionCommon {
  raw: Raw
  confirmations: number // 0 if not confirmed
  confirmed: boolean,
  block: number | null // null if not confirmed
  date: Date
}
