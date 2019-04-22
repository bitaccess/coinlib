import * as t from 'io-ts';
import { DateT } from './DateT';
import { enumCodec, extend, nullable } from './helpers';
export * from './DateT';
export * from './helpers';
export var BalanceResult = t.type({
    balance: t.string,
    unconfirmedBalance: t.string,
});
export var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["Unsigned"] = "unsigned";
    TransactionStatus["Signed"] = "signed";
    TransactionStatus["Pending"] = "pending";
    TransactionStatus["Confirmed"] = "confirmed";
    TransactionStatus["Failed"] = "failed";
})(TransactionStatus || (TransactionStatus = {}));
export var TransactionStatusT = enumCodec(TransactionStatus, 'TransactionStatus');
export var TransactionCommon = t.type({
    id: nullable(t.string),
    from: nullable(t.string),
    to: nullable(t.string),
    toExtraId: nullable(t.string),
    fromIndex: nullable(t.number),
    toIndex: nullable(t.number),
    amount: nullable(t.string),
    fee: nullable(t.string),
    status: TransactionStatusT,
});
var UnsignedCommon = extend(TransactionCommon, {
    from: t.string,
    to: t.string,
    fromIndex: t.number,
    rawUnsigned: t.UnknownRecord,
}, {}, 'UnsignedCommon');
export var BaseUnsignedTransaction = extend(UnsignedCommon, {
    status: t.literal('unsigned'),
}, {}, 'BaseUnsignedTransaction');
export var BaseSignedTransaction = extend(UnsignedCommon, {
    status: t.literal('signed'),
    id: t.string,
    amount: t.string,
    fee: t.string,
    rawSigned: t.UnknownRecord,
}, {}, 'BaseSignedTransaction');
export var BaseTransactionInfo = extend(TransactionCommon, {
    id: t.string,
    amount: t.string,
    fee: t.string,
    isExecuted: t.boolean,
    isConfirmed: t.boolean,
    confirmations: t.number,
    block: nullable(t.number),
    date: nullable(DateT),
    rawInfo: t.UnknownRecord,
}, {}, 'BaseTransactionInfo');
export var BaseBroadcastResult = t.type({
    id: t.string,
}, 'BaseBroadcastResult');
//# sourceMappingURL=index.js.map