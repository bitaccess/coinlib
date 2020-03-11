'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var t = require('io-ts');
var tsCommon = require('@faast/ts-common');
var BigNumber = _interopDefault(require('bignumber.js'));

(function (NetworkType) {
    NetworkType["Mainnet"] = "mainnet";
    NetworkType["Testnet"] = "testnet";
})(exports.NetworkType || (exports.NetworkType = {}));
const NetworkTypeT = tsCommon.enumCodec(exports.NetworkType, 'NetworkType');
const BaseConfig = t.partial({
    network: NetworkTypeT,
    logger: tsCommon.Logger,
}, 'BaseConfig');
const Payport = tsCommon.requiredOptionalCodec({
    address: t.string,
}, {
    extraId: tsCommon.nullable(t.string),
}, 'Payport');
const ResolveablePayport = t.union([Payport, t.string, t.number], 'ResolveablePayport');
(function (FeeLevel) {
    FeeLevel["Custom"] = "custom";
    FeeLevel["Low"] = "low";
    FeeLevel["Medium"] = "medium";
    FeeLevel["High"] = "high";
})(exports.FeeLevel || (exports.FeeLevel = {}));
const FeeLevelT = tsCommon.enumCodec(exports.FeeLevel, 'FeeLevel');
const AutoFeeLevels = t.keyof({
    [exports.FeeLevel.Low]: null,
    [exports.FeeLevel.Medium]: null,
    [exports.FeeLevel.High]: null,
}, 'AutoFeeLevels');
(function (FeeRateType) {
    FeeRateType["Main"] = "main";
    FeeRateType["Base"] = "base";
    FeeRateType["BasePerWeight"] = "base/weight";
})(exports.FeeRateType || (exports.FeeRateType = {}));
const FeeRateTypeT = tsCommon.enumCodec(exports.FeeRateType, 'FeeRateType');
const FeeRate = t.type({
    feeRate: t.string,
    feeRateType: FeeRateTypeT,
}, 'FeeRate');
const FeeOptionCustom = tsCommon.extendCodec(FeeRate, {}, {
    feeLevel: t.literal(exports.FeeLevel.Custom),
}, 'FeeOptionCustom');
const FeeOptionLevel = t.partial({
    feeLevel: t.union([t.literal(exports.FeeLevel.High), t.literal(exports.FeeLevel.Medium), t.literal(exports.FeeLevel.Low)]),
}, 'FeeOptionLevel');
const FeeOption = t.union([FeeOptionCustom, FeeOptionLevel], 'FeeOption');
const UtxoInfo = tsCommon.requiredOptionalCodec({
    txid: t.string,
    vout: t.number,
    value: t.string,
}, {
    satoshis: t.number,
    confirmations: t.number,
    height: t.string,
    lockTime: t.string,
    coinbase: t.boolean,
}, 'UtxoInfo');
const WeightedChangeOutput = t.type({
    address: t.string,
    weight: t.number,
}, 'WeightedChangeOutput');
const CreateTransactionOptions = tsCommon.extendCodec(FeeOption, {}, {
    sequenceNumber: tsCommon.Numeric,
    payportBalance: tsCommon.Numeric,
    utxos: t.array(UtxoInfo),
    useAllUtxos: t.boolean,
    useUnconfirmedUtxos: t.boolean,
}, 'CreateTransactionOptions');
const GetPayportOptions = t.partial({}, 'GetPayportOptions');
const ResolvedFeeOption = t.type({
    targetFeeLevel: FeeLevelT,
    targetFeeRate: t.string,
    targetFeeRateType: FeeRateTypeT,
    feeBase: t.string,
    feeMain: t.string,
}, 'ResolvedFeeOption');
const BalanceResult = t.type({
    confirmedBalance: t.string,
    unconfirmedBalance: t.string,
    sweepable: t.boolean,
}, 'BalanceResult');
(function (TransactionStatus) {
    TransactionStatus["Unsigned"] = "unsigned";
    TransactionStatus["Signed"] = "signed";
    TransactionStatus["Pending"] = "pending";
    TransactionStatus["Confirmed"] = "confirmed";
    TransactionStatus["Failed"] = "failed";
})(exports.TransactionStatus || (exports.TransactionStatus = {}));
const TransactionStatusT = tsCommon.enumCodec(exports.TransactionStatus, 'TransactionStatus');
const TransactionCommon = tsCommon.requiredOptionalCodec({
    status: TransactionStatusT,
    id: tsCommon.nullable(t.string),
    fromAddress: tsCommon.nullable(t.string),
    toAddress: tsCommon.nullable(t.string),
    fromIndex: tsCommon.nullable(t.number),
    toIndex: tsCommon.nullable(t.number),
    amount: tsCommon.nullable(t.string),
    fee: tsCommon.nullable(t.string),
}, {
    fromExtraId: tsCommon.nullable(t.string),
    toExtraId: tsCommon.nullable(t.string),
    sequenceNumber: tsCommon.nullable(t.union([t.string, t.number])),
}, 'TransactionCommon');
const UnsignedCommon = tsCommon.extendCodec(TransactionCommon, {
    fromAddress: t.string,
    toAddress: t.string,
    fromIndex: t.number,
    targetFeeLevel: FeeLevelT,
    targetFeeRate: tsCommon.nullable(t.string),
    targetFeeRateType: tsCommon.nullable(FeeRateTypeT),
}, {
    inputUtxos: t.array(UtxoInfo),
}, 'UnsignedCommon');
const BaseUnsignedTransaction = tsCommon.extendCodec(UnsignedCommon, {
    status: t.literal(exports.TransactionStatus.Unsigned),
    data: t.object,
}, 'BaseUnsignedTransaction');
const BaseSignedTransaction = tsCommon.extendCodec(UnsignedCommon, {
    status: t.literal(exports.TransactionStatus.Signed),
    id: t.string,
    amount: t.string,
    fee: t.string,
    data: t.object,
}, 'BaseSignedTransaction');
const BaseTransactionInfo = tsCommon.extendCodec(TransactionCommon, {
    id: t.string,
    amount: t.string,
    fee: t.string,
    isExecuted: t.boolean,
    isConfirmed: t.boolean,
    confirmations: t.number,
    confirmationId: tsCommon.nullable(t.string),
    confirmationTimestamp: tsCommon.nullable(tsCommon.DateT),
    data: t.object,
}, {
    confirmationNumber: t.union([t.string, t.number])
}, 'BaseTransactionInfo');
const BaseBroadcastResult = t.type({
    id: t.string,
}, 'BaseBroadcastResult');
const BalanceActivityType = t.union([t.literal('in'), t.literal('out')], 'BalanceActivityType');
const BalanceActivity = t.type({
    type: BalanceActivityType,
    networkType: NetworkTypeT,
    networkSymbol: t.string,
    assetSymbol: t.string,
    address: t.string,
    extraId: tsCommon.nullable(t.string),
    amount: t.string,
    externalId: t.string,
    activitySequence: t.string,
    confirmationId: t.string,
    confirmationNumber: t.union([t.string, t.number]),
    timestamp: tsCommon.DateT,
}, 'BalanceActivity');
const BalanceMonitorConfig = BaseConfig;
const GetBalanceActivityOptions = t.partial({
    from: t.union([tsCommon.Numeric, BalanceActivity]),
    to: t.union([tsCommon.Numeric, BalanceActivity]),
}, 'GetBalanceActivityOptions');
const BalanceActivityCallback = tsCommon.functionT('BalanceActivityCallback');
const RetrieveBalanceActivitiesResult = t.type({
    from: t.string,
    to: t.string,
}, 'RetrieveBalanceActivitiesResult');

function isMatchingError(e, partialMessages) {
    const messageLower = e.toString().toLowerCase();
    return partialMessages.some(pm => messageLower.includes(pm.toLowerCase()));
}
function createUnitConverters(decimals) {
    const basePerMain = new BigNumber(10).pow(decimals);
    function toMainDenominationBigNumber(baseNumeric) {
        const baseUnits = new BigNumber(baseNumeric);
        if (baseUnits.isNaN()) {
            throw new Error('Cannot convert to main denomination - not a number');
        }
        if (!baseUnits.isFinite()) {
            throw new Error('Cannot convert to main denomination - not finite');
        }
        return baseUnits.div(basePerMain);
    }
    function toMainDenominationString(baseNumeric) {
        return toMainDenominationBigNumber(baseNumeric).toString();
    }
    function toMainDenominationNumber(baseNumeric) {
        return toMainDenominationBigNumber(baseNumeric).toNumber();
    }
    function toBaseDenominationBigNumber(mainNumeric) {
        const mainUnits = new BigNumber(mainNumeric);
        if (mainUnits.isNaN()) {
            throw new Error('Cannot convert to base denomination - not a number');
        }
        if (!mainUnits.isFinite()) {
            throw new Error('Cannot convert to base denomination - not finite');
        }
        return mainUnits.times(basePerMain);
    }
    function toBaseDenominationString(mainNumeric) {
        return toBaseDenominationBigNumber(mainNumeric).toString();
    }
    function toBaseDenominationNumber(mainNumeric) {
        return toBaseDenominationBigNumber(mainNumeric).toNumber();
    }
    return {
        toMainDenominationBigNumber,
        toMainDenominationNumber,
        toMainDenominationString,
        toBaseDenominationBigNumber,
        toBaseDenominationNumber,
        toBaseDenominationString,
    };
}

(function (PaymentsErrorCode) {
    PaymentsErrorCode["TxExpired"] = "PAYMENTS_TX_EXPIRED";
    PaymentsErrorCode["TxSequenceTooHigh"] = "PAYMENTS_TX_SEQUENCE_TOO_HIGH";
    PaymentsErrorCode["TxSequenceCollision"] = "PAYMENTS_TX_SEQUENCE_COLLISION";
})(exports.PaymentsErrorCode || (exports.PaymentsErrorCode = {}));
class PaymentsError extends Error {
    constructor(code, message) {
        super(typeof message === 'undefined' ? code : `${code} - ${message.toString()}`);
        this.code = code;
        this.name = PaymentsError.name;
    }
}

exports.AutoFeeLevels = AutoFeeLevels;
exports.BalanceActivity = BalanceActivity;
exports.BalanceActivityCallback = BalanceActivityCallback;
exports.BalanceActivityType = BalanceActivityType;
exports.BalanceMonitorConfig = BalanceMonitorConfig;
exports.BalanceResult = BalanceResult;
exports.BaseBroadcastResult = BaseBroadcastResult;
exports.BaseConfig = BaseConfig;
exports.BaseSignedTransaction = BaseSignedTransaction;
exports.BaseTransactionInfo = BaseTransactionInfo;
exports.BaseUnsignedTransaction = BaseUnsignedTransaction;
exports.CreateTransactionOptions = CreateTransactionOptions;
exports.FeeLevelT = FeeLevelT;
exports.FeeOption = FeeOption;
exports.FeeOptionCustom = FeeOptionCustom;
exports.FeeOptionLevel = FeeOptionLevel;
exports.FeeRate = FeeRate;
exports.FeeRateTypeT = FeeRateTypeT;
exports.GetBalanceActivityOptions = GetBalanceActivityOptions;
exports.GetPayportOptions = GetPayportOptions;
exports.NetworkTypeT = NetworkTypeT;
exports.PaymentsError = PaymentsError;
exports.Payport = Payport;
exports.ResolveablePayport = ResolveablePayport;
exports.ResolvedFeeOption = ResolvedFeeOption;
exports.RetrieveBalanceActivitiesResult = RetrieveBalanceActivitiesResult;
exports.TransactionCommon = TransactionCommon;
exports.TransactionStatusT = TransactionStatusT;
exports.UtxoInfo = UtxoInfo;
exports.WeightedChangeOutput = WeightedChangeOutput;
exports.createUnitConverters = createUnitConverters;
exports.isMatchingError = isMatchingError;
//# sourceMappingURL=index.cjs.js.map
