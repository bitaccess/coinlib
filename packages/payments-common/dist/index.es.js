import { union, string, number, literal, type, UnknownRecord, boolean } from 'io-ts';
import { requiredOptionalCodec, extendCodec, enumCodec, nullable, DateT } from '@faast/ts-common';

var AddressOrIndex = union([string, number], 'AddressOrIndex');
var FeeLevel;
(function (FeeLevel) {
    FeeLevel["Custom"] = "custom";
    FeeLevel["Low"] = "low";
    FeeLevel["Medium"] = "medium";
    FeeLevel["High"] = "high";
})(FeeLevel || (FeeLevel = {}));
var FeeLevelT = enumCodec(FeeLevel, 'FeeLevel');
var FeeRateType;
(function (FeeRateType) {
    FeeRateType["Main"] = "main";
    FeeRateType["Base"] = "base";
    FeeRateType["BasePerWeight"] = "base/weight";
})(FeeRateType || (FeeRateType = {}));
var FeeRateTypeT = enumCodec(FeeRateType, 'FeeRateType');
var FeeOptionCustom = requiredOptionalCodec({
    feeRate: string,
    feeRateType: FeeRateTypeT,
}, {
    feeLevel: literal(FeeLevel.Custom),
}, 'FeeOptionCustom');
var FeeOptionLevel = type({
    feeLevel: union([literal(FeeLevel.High), literal(FeeLevel.Medium), literal(FeeLevel.Low)]),
}, 'FeeOptionLevel');
var FeeOption = union([FeeOptionCustom, FeeOptionLevel], 'FeeOption');
var CreateTransactionOptions = FeeOption;
var ResolvedFeeOption = type({
    targetFeeLevel: FeeLevelT,
    targetFeeRate: string,
    targetFeeRateType: FeeRateTypeT,
    feeBase: string,
    feeMain: string,
});
var BalanceResult = type({
    balance: string,
    unconfirmedBalance: string,
}, 'BalanceResult');
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["Unsigned"] = "unsigned";
    TransactionStatus["Signed"] = "signed";
    TransactionStatus["Pending"] = "pending";
    TransactionStatus["Confirmed"] = "confirmed";
    TransactionStatus["Failed"] = "failed";
})(TransactionStatus || (TransactionStatus = {}));
var TransactionStatusT = enumCodec(TransactionStatus, 'TransactionStatus');
var TransactionCommon = type({
    id: nullable(string),
    fromAddress: nullable(string),
    toAddress: nullable(string),
    toExtraId: nullable(string),
    fromIndex: nullable(number),
    toIndex: nullable(number),
    amount: nullable(string),
    fee: nullable(string),
    status: TransactionStatusT,
}, 'TransactionCommon');
var UnsignedCommon = extendCodec(TransactionCommon, {
    fromAddress: string,
    toAddress: string,
    fromIndex: number,
    targetFeeLevel: FeeLevelT,
    targetFeeRate: nullable(string),
    targetFeeRateType: nullable(FeeRateTypeT),
}, 'UnsignedCommon');
var BaseUnsignedTransaction = extendCodec(UnsignedCommon, {
    status: literal('unsigned'),
    data: UnknownRecord,
}, 'BaseUnsignedTransaction');
var BaseSignedTransaction = extendCodec(UnsignedCommon, {
    status: literal('signed'),
    id: string,
    amount: string,
    fee: string,
    data: UnknownRecord,
}, 'BaseSignedTransaction');
var BaseTransactionInfo = extendCodec(TransactionCommon, {
    id: string,
    amount: string,
    fee: string,
    isExecuted: boolean,
    isConfirmed: boolean,
    confirmations: number,
    block: nullable(number),
    date: nullable(DateT),
    data: UnknownRecord,
}, 'BaseTransactionInfo');
var BaseBroadcastResult = type({
    id: string,
}, 'BaseBroadcastResult');

export { AddressOrIndex, FeeLevel, FeeLevelT, FeeRateType, FeeRateTypeT, FeeOptionCustom, FeeOptionLevel, FeeOption, CreateTransactionOptions, ResolvedFeeOption, BalanceResult, TransactionStatus, TransactionStatusT, TransactionCommon, BaseUnsignedTransaction, BaseSignedTransaction, BaseTransactionInfo, BaseBroadcastResult };
//# sourceMappingURL=index.es.js.map
