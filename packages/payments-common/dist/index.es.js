import { partial, string, union, number, keyof, type, literal, boolean, array, object } from 'io-ts';
import { enumCodec, Logger, requiredOptionalCodec, nullable, extendCodec, Numeric, DateT, functionT } from '@faast/ts-common';
import BigNumber from 'bignumber.js';

var NetworkType;
(function (NetworkType) {
    NetworkType["Mainnet"] = "mainnet";
    NetworkType["Testnet"] = "testnet";
})(NetworkType || (NetworkType = {}));
const NetworkTypeT = enumCodec(NetworkType, 'NetworkType');
const BaseConfig = partial({
    network: NetworkTypeT,
    logger: Logger,
}, 'BaseConfig');
const Payport = requiredOptionalCodec({
    address: string,
}, {
    extraId: nullable(string),
}, 'Payport');
const ResolveablePayport = union([Payport, string, number], 'ResolveablePayport');
var FeeLevel;
(function (FeeLevel) {
    FeeLevel["Custom"] = "custom";
    FeeLevel["Low"] = "low";
    FeeLevel["Medium"] = "medium";
    FeeLevel["High"] = "high";
})(FeeLevel || (FeeLevel = {}));
const FeeLevelT = enumCodec(FeeLevel, 'FeeLevel');
const AutoFeeLevels = keyof({
    [FeeLevel.Low]: null,
    [FeeLevel.Medium]: null,
    [FeeLevel.High]: null,
}, 'AutoFeeLevels');
var FeeRateType;
(function (FeeRateType) {
    FeeRateType["Main"] = "main";
    FeeRateType["Base"] = "base";
    FeeRateType["BasePerWeight"] = "base/weight";
})(FeeRateType || (FeeRateType = {}));
const FeeRateTypeT = enumCodec(FeeRateType, 'FeeRateType');
const FeeRate = type({
    feeRate: string,
    feeRateType: FeeRateTypeT,
}, 'FeeRate');
const FeeOptionCustom = extendCodec(FeeRate, {}, {
    feeLevel: literal(FeeLevel.Custom),
}, 'FeeOptionCustom');
const FeeOptionLevel = partial({
    feeLevel: union([literal(FeeLevel.High), literal(FeeLevel.Medium), literal(FeeLevel.Low)]),
}, 'FeeOptionLevel');
const FeeOption = union([FeeOptionCustom, FeeOptionLevel], 'FeeOption');
const UtxoInfo = requiredOptionalCodec({
    txid: string,
    vout: number,
    value: string,
}, {
    satoshis: number,
    confirmations: number,
    height: string,
    lockTime: string,
    coinbase: boolean,
}, 'UtxoInfo');
const WeightedChangeOutput = type({
    address: string,
    weight: number,
}, 'WeightedChangeOutput');
const CreateTransactionOptions = extendCodec(FeeOption, {}, {
    sequenceNumber: Numeric,
    payportBalance: Numeric,
    utxos: array(UtxoInfo),
    useAllUtxos: boolean,
    useUnconfirmedUtxos: boolean,
}, 'CreateTransactionOptions');
const GetPayportOptions = partial({}, 'GetPayportOptions');
const ResolvedFeeOption = type({
    targetFeeLevel: FeeLevelT,
    targetFeeRate: string,
    targetFeeRateType: FeeRateTypeT,
    feeBase: string,
    feeMain: string,
}, 'ResolvedFeeOption');
const BalanceResult = type({
    confirmedBalance: string,
    unconfirmedBalance: string,
    sweepable: boolean,
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
const TransactionCommon = requiredOptionalCodec({
    status: TransactionStatusT,
    id: nullable(string),
    fromAddress: nullable(string),
    toAddress: nullable(string),
    fromIndex: nullable(number),
    toIndex: nullable(number),
    amount: nullable(string),
    fee: nullable(string),
}, {
    fromExtraId: nullable(string),
    toExtraId: nullable(string),
    sequenceNumber: nullable(union([string, number])),
}, 'TransactionCommon');
const UnsignedCommon = extendCodec(TransactionCommon, {
    fromAddress: string,
    toAddress: string,
    fromIndex: number,
    targetFeeLevel: FeeLevelT,
    targetFeeRate: nullable(string),
    targetFeeRateType: nullable(FeeRateTypeT),
}, {
    inputUtxos: array(UtxoInfo),
}, 'UnsignedCommon');
const BaseUnsignedTransaction = extendCodec(UnsignedCommon, {
    status: literal(TransactionStatus.Unsigned),
    data: object,
}, 'BaseUnsignedTransaction');
const BaseSignedTransaction = extendCodec(UnsignedCommon, {
    status: literal(TransactionStatus.Signed),
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
}, {
    confirmationNumber: union([string, number])
}, 'BaseTransactionInfo');
const BaseBroadcastResult = type({
    id: string,
}, 'BaseBroadcastResult');
const BalanceActivityType = union([literal('in'), literal('out')], 'BalanceActivityType');
const BalanceActivity = type({
    type: BalanceActivityType,
    networkType: NetworkTypeT,
    networkSymbol: string,
    assetSymbol: string,
    address: string,
    extraId: nullable(string),
    amount: string,
    externalId: string,
    activitySequence: string,
    confirmationId: string,
    confirmationNumber: union([string, number]),
    timestamp: DateT,
}, 'BalanceActivity');
const BalanceMonitorConfig = BaseConfig;
const GetBalanceActivityOptions = partial({
    from: union([Numeric, BalanceActivity]),
    to: union([Numeric, BalanceActivity]),
}, 'GetBalanceActivityOptions');
const BalanceActivityCallback = functionT('BalanceActivityCallback');
const RetrieveBalanceActivitiesResult = type({
    from: string,
    to: string,
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

var PaymentsErrorCode;
(function (PaymentsErrorCode) {
    PaymentsErrorCode["TxExpired"] = "PAYMENTS_TX_EXPIRED";
    PaymentsErrorCode["TxSequenceTooHigh"] = "PAYMENTS_TX_SEQUENCE_TOO_HIGH";
    PaymentsErrorCode["TxSequenceCollision"] = "PAYMENTS_TX_SEQUENCE_COLLISION";
})(PaymentsErrorCode || (PaymentsErrorCode = {}));
class PaymentsError extends Error {
    constructor(code, message) {
        super(typeof message === 'undefined' ? code : `${code} - ${message.toString()}`);
        this.code = code;
        this.name = PaymentsError.name;
    }
}

export { AutoFeeLevels, BalanceActivity, BalanceActivityCallback, BalanceActivityType, BalanceMonitorConfig, BalanceResult, BaseBroadcastResult, BaseConfig, BaseSignedTransaction, BaseTransactionInfo, BaseUnsignedTransaction, CreateTransactionOptions, FeeLevel, FeeLevelT, FeeOption, FeeOptionCustom, FeeOptionLevel, FeeRate, FeeRateType, FeeRateTypeT, GetBalanceActivityOptions, GetPayportOptions, NetworkType, NetworkTypeT, PaymentsError, PaymentsErrorCode, Payport, ResolveablePayport, ResolvedFeeOption, RetrieveBalanceActivitiesResult, TransactionCommon, TransactionStatus, TransactionStatusT, UtxoInfo, WeightedChangeOutput, createUnitConverters, isMatchingError };
//# sourceMappingURL=index.es.js.map
