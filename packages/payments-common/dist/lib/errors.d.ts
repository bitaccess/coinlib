export declare enum PaymentsErrorCode {
    TxExpired = "PAYMENTS_TX_EXPIRED",
    TxSequenceTooHigh = "PAYMENTS_TX_SEQUENCE_TOO_HIGH",
    TxSequenceCollision = "PAYMENTS_TX_SEQUENCE_COLLISION"
}
export declare class PaymentsError extends Error {
    code: PaymentsErrorCode;
    name: string;
    constructor(code: PaymentsErrorCode, message?: string | Error);
    toString(): string;
}
