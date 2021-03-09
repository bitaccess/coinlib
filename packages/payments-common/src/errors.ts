export enum PaymentsErrorCode {
  TxExpired = 'PAYMENTS_TX_EXPIRED',
  TxSequenceTooHigh = 'PAYMENTS_TX_SEQUENCE_TOO_HIGH',
  TxSequenceCollision = 'PAYMENTS_TX_SEQUENCE_COLLISION',
  /** Sender doesn't have enough balance for the output amount + fee */
  TxInsufficientBalance = 'PAYMENTS_TX_INSUFFICIENT_BALANCE',
  /** Fee exceeds the maximum acceptable percent relative to output amount */
  TxFeeTooHigh = 'PAYMENTS_TX_FEE_TOO_HIGH',
}

export class PaymentsError extends Error {
  name = PaymentsError.name

  constructor(public code: PaymentsErrorCode, message?: string | Error) {
    super(typeof message === 'undefined' ? code : `${code} - ${message.toString()}`)
  }
}
