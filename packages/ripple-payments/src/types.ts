
export interface Transaction {
  id: string
  from: string
  to: string
  amount: string // main denomination (eg "0.125")
  feeRate: number // base denomination (ie sat/byte)
  fee: string // total fee in main denomination
  data: any // TODO: Shape TBD -- dependent on monero lib used
}

export interface TransactionStatus extends Transaction {
  confirmations: number
  block: number | null
}
