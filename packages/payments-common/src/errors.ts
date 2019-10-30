export enum PaymentsErrorCode {
  TxExpired = 'PAYMENTS_TX_EXPIRED',
  TxSequenceTooHigh = 'PAYMENTS_TX_SEQUENCE_TOO_HIGH',
  TxSequenceCollision = 'PAYMENTS_TX_SEQUENCE_COLLISION',
}

export class PaymentsError extends Error {
  name = PaymentsError.name

  constructor(public code: PaymentsErrorCode, message?: string | Error) {
    super(typeof message === 'undefined' ? code : `${code} - ${message.toString()}`)
  }
}
