
export interface MoneroPaymentsOptions {
  paymentsNode: string // required
  network?: 'mainnet' | 'stagenet' | 'testnet' // default to mainnet
}

export interface CreateTransactionOptions {
  feeRate?: number // base denomination per byte (ie sat/byte)
}

export interface TxObject {
  from: string
  to: string
  amount: string // main denomination (eg "0.125")
  feeRate: number // base denomination (ie sat/byte)
  fee: string // total fee in main denomination
}

export interface TxStatus extends TxObject {
  id: string
  confirmations: number
  block: number | null
}

export interface UnsignedTx extends TxObject {
  data: any // TODO: Shape TBD -- dependent on monero lib used
}

export interface SignedTx extends TxObject {
  id: string
  signedData: any // Shape TBD -- dependent on monero lib used
}