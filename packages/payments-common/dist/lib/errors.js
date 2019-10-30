export var PaymentsErrorCode;
(function (PaymentsErrorCode) {
    PaymentsErrorCode["TxExpired"] = "PAYMENTS_TX_EXPIRED";
    PaymentsErrorCode["TxSequenceTooHigh"] = "PAYMENTS_TX_SEQUENCE_TOO_HIGH";
    PaymentsErrorCode["TxSequenceCollision"] = "PAYMENTS_TX_SEQUENCE_COLLISION";
})(PaymentsErrorCode || (PaymentsErrorCode = {}));
export class PaymentsError extends Error {
    constructor(code, message) {
        super(typeof message === 'undefined' ? code : `${code} - ${message.toString()}`);
        this.code = code;
        this.name = PaymentsError.name;
    }
}
//# sourceMappingURL=errors.js.map