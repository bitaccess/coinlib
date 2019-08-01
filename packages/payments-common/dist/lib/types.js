import * as t from 'io-ts';
import { requiredOptionalCodec, extendCodec, enumCodec, nullable, DateT, Logger, functionT } from '@faast/ts-common';
export var NetworkType;
(function (NetworkType) {
    NetworkType["Mainnet"] = "mainnet";
    NetworkType["Testnet"] = "testnet";
})(NetworkType || (NetworkType = {}));
export const NetworkTypeT = enumCodec(NetworkType, 'NetworkType');
export const BaseConfig = t.partial({
    network: NetworkTypeT,
    logger: Logger,
}, 'BaseConfig');
export const AddressOrIndex = t.union([t.string, t.number], 'AddressOrIndex');
export var FeeLevel;
(function (FeeLevel) {
    FeeLevel["Custom"] = "custom";
    FeeLevel["Low"] = "low";
    FeeLevel["Medium"] = "medium";
    FeeLevel["High"] = "high";
})(FeeLevel || (FeeLevel = {}));
export const FeeLevelT = enumCodec(FeeLevel, 'FeeLevel');
export var FeeRateType;
(function (FeeRateType) {
    FeeRateType["Main"] = "main";
    FeeRateType["Base"] = "base";
    FeeRateType["BasePerWeight"] = "base/weight";
})(FeeRateType || (FeeRateType = {}));
export const FeeRateTypeT = enumCodec(FeeRateType, 'FeeRateType');
export const FeeOptionCustom = requiredOptionalCodec({
    feeRate: t.string,
    feeRateType: FeeRateTypeT,
}, {
    feeLevel: t.literal(FeeLevel.Custom),
}, 'FeeOptionCustom');
export const FeeOptionLevel = t.type({
    feeLevel: t.union([t.literal(FeeLevel.High), t.literal(FeeLevel.Medium), t.literal(FeeLevel.Low)]),
}, 'FeeOptionLevel');
export const FeeOption = t.union([FeeOptionCustom, FeeOptionLevel], 'FeeOption');
export const CreateTransactionOptions = FeeOption;
export const ResolvedFeeOption = t.type({
    targetFeeLevel: FeeLevelT,
    targetFeeRate: t.string,
    targetFeeRateType: FeeRateTypeT,
    feeBase: t.string,
    feeMain: t.string,
});
export const BalanceResult = t.type({
    confirmedBalance: t.string,
    unconfirmedBalance: t.string,
    sweepable: t.boolean,
}, 'BalanceResult');
export var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["Unsigned"] = "unsigned";
    TransactionStatus["Signed"] = "signed";
    TransactionStatus["Pending"] = "pending";
    TransactionStatus["Confirmed"] = "confirmed";
    TransactionStatus["Failed"] = "failed";
})(TransactionStatus || (TransactionStatus = {}));
export const TransactionStatusT = enumCodec(TransactionStatus, 'TransactionStatus');
export const TransactionCommon = requiredOptionalCodec({
    id: nullable(t.string),
    fromAddress: nullable(t.string),
    toAddress: nullable(t.string),
    fromIndex: nullable(t.number),
    toIndex: nullable(t.number),
    amount: nullable(t.string),
    fee: nullable(t.string),
    status: TransactionStatusT,
}, {
    fromExtraId: nullable(t.string),
    toExtraId: nullable(t.string),
}, 'TransactionCommon');
const UnsignedCommon = extendCodec(TransactionCommon, {
    fromAddress: t.string,
    toAddress: t.string,
    fromIndex: t.number,
    targetFeeLevel: FeeLevelT,
    targetFeeRate: nullable(t.string),
    targetFeeRateType: nullable(FeeRateTypeT),
}, 'UnsignedCommon');
export const BaseUnsignedTransaction = extendCodec(UnsignedCommon, {
    status: t.literal('unsigned'),
    data: t.object,
}, 'BaseUnsignedTransaction');
export const BaseSignedTransaction = extendCodec(UnsignedCommon, {
    status: t.literal('signed'),
    id: t.string,
    amount: t.string,
    fee: t.string,
    data: t.object,
}, 'BaseSignedTransaction');
export const BaseTransactionInfo = extendCodec(TransactionCommon, {
    id: t.string,
    amount: t.string,
    fee: t.string,
    isExecuted: t.boolean,
    isConfirmed: t.boolean,
    confirmations: t.number,
    confirmationId: nullable(t.string),
    confirmationTimestamp: nullable(DateT),
    data: t.object,
}, 'BaseTransactionInfo');
export const BaseBroadcastResult = t.type({
    id: t.string,
}, 'BaseBroadcastResult');
export const Payport = requiredOptionalCodec({
    address: t.string,
}, {
    extraId: nullable(t.string),
}, 'Payport');
export const BalanceActivityType = t.union([t.literal('in'), t.literal('out')], 'BalanceActivityType');
export const BalanceActivity = t.type({
    type: BalanceActivityType,
    networkType: NetworkTypeT,
    networkSymbol: t.string,
    assetSymbol: t.string,
    address: t.string,
    extraId: nullable(t.string),
    amount: t.string,
    externalId: t.string,
    activitySequence: t.string,
    confirmationId: t.string,
    confirmationNumber: t.number,
    timestamp: DateT,
}, 'BalanceActivity');
export const BalanceMonitorConfig = requiredOptionalCodec({
    network: NetworkTypeT,
}, {
    logger: Logger,
}, 'BalanceMonitorConfig');
export const GetBalanceActivityOptions = t.partial({
    from: BalanceActivity,
    to: BalanceActivity,
}, 'GetBalanceActivityOptions');
export const BalanceActivityCallback = functionT('BalanceActivityCallback');
//# sourceMappingURL=types.js.map