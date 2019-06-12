import { partial, union, string, number, literal, type, object, boolean } from 'io-ts';
import { requiredOptionalCodec, extendCodec, enumCodec, nullable, DateT } from '@faast/ts-common';

var NetworkType;
(function (NetworkType) {
    NetworkType["Mainnet"] = "mainnet";
    NetworkType["Testnet"] = "testnet";
})(NetworkType || (NetworkType = {}));
const NetworkTypeT = enumCodec(NetworkType, 'NetworkType');
const BaseConfig = partial({
    network: NetworkTypeT,
}, 'BaseConfig');
const AddressOrIndex = union([string, number], 'AddressOrIndex');
var FeeLevel;
(function (FeeLevel) {
    FeeLevel["Custom"] = "custom";
    FeeLevel["Low"] = "low";
    FeeLevel["Medium"] = "medium";
    FeeLevel["High"] = "high";
})(FeeLevel || (FeeLevel = {}));
const FeeLevelT = enumCodec(FeeLevel, 'FeeLevel');
var FeeRateType;
(function (FeeRateType) {
    FeeRateType["Main"] = "main";
    FeeRateType["Base"] = "base";
    FeeRateType["BasePerWeight"] = "base/weight";
})(FeeRateType || (FeeRateType = {}));
const FeeRateTypeT = enumCodec(FeeRateType, 'FeeRateType');
const FeeOptionCustom = requiredOptionalCodec({
    feeRate: string,
    feeRateType: FeeRateTypeT,
}, {
    feeLevel: literal(FeeLevel.Custom),
}, 'FeeOptionCustom');
const FeeOptionLevel = type({
    feeLevel: union([literal(FeeLevel.High), literal(FeeLevel.Medium), literal(FeeLevel.Low)]),
}, 'FeeOptionLevel');
const FeeOption = union([FeeOptionCustom, FeeOptionLevel], 'FeeOption');
const CreateTransactionOptions = FeeOption;
const ResolvedFeeOption = type({
    targetFeeLevel: FeeLevelT,
    targetFeeRate: string,
    targetFeeRateType: FeeRateTypeT,
    feeBase: string,
    feeMain: string,
});
const BalanceResult = type({
    confirmedBalance: string,
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
const TransactionStatusT = enumCodec(TransactionStatus, 'TransactionStatus');
const TransactionCommon = type({
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
const UnsignedCommon = extendCodec(TransactionCommon, {
    fromAddress: string,
    toAddress: string,
    fromIndex: number,
    targetFeeLevel: FeeLevelT,
    targetFeeRate: nullable(string),
    targetFeeRateType: nullable(FeeRateTypeT),
}, 'UnsignedCommon');
const BaseUnsignedTransaction = extendCodec(UnsignedCommon, {
    status: literal('unsigned'),
    data: object,
}, 'BaseUnsignedTransaction');
const BaseSignedTransaction = extendCodec(UnsignedCommon, {
    status: literal('signed'),
    id: string,
    amount: string,
    fee: string,
    data: object,
}, 'BaseSignedTransaction');
const BaseTransactionInfo = extendCodec(TransactionCommon, {
    id: string,
    amount: string,
    fee: string,
    isExecuted: boolean,
    isConfirmed: boolean,
    confirmations: number,
    confirmationId: nullable(string),
    confirmationTimestamp: nullable(DateT),
    data: object,
}, 'BaseTransactionInfo');
const BaseBroadcastResult = type({
    id: string,
}, 'BaseBroadcastResult');

export { NetworkType, NetworkTypeT, BaseConfig, AddressOrIndex, FeeLevel, FeeLevelT, FeeRateType, FeeRateTypeT, FeeOptionCustom, FeeOptionLevel, FeeOption, CreateTransactionOptions, ResolvedFeeOption, BalanceResult, TransactionStatus, TransactionStatusT, TransactionCommon, BaseUnsignedTransaction, BaseSignedTransaction, BaseTransactionInfo, BaseBroadcastResult };
//# sourceMappingURL=index.es.js.map
