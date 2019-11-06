import { partial, union, string, number, literal, type, boolean, object } from 'io-ts';
import { enumCodec, Logger, requiredOptionalCodec, extendCodec, Numeric, nullable, DateT, functionT } from '@faast/ts-common';
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
const FeeOptionLevel = partial({
    feeLevel: union([literal(FeeLevel.High), literal(FeeLevel.Medium), literal(FeeLevel.Low)]),
}, 'FeeOptionLevel');
const FeeOption = union([FeeOptionCustom, FeeOptionLevel], 'FeeOption');
const CreateTransactionOptions = extendCodec(FeeOption, {}, {
    sequenceNumber: Numeric,
    payportBalance: Numeric,
}, 'CreateTransactionOptions');
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
}, 'BaseTransactionInfo');
const BaseBroadcastResult = type({
    id: string,
}, 'BaseBroadcastResult');
const Payport = requiredOptionalCodec({
    address: string,
}, {
    extraId: nullable(string),
}, 'Payport');
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
const ResolveablePayport = union([Payport, string, number], 'ResolveablePayport');
const RetrieveBalanceActivitiesResult = type({
    from: string,
    to: string,
}, 'RetrieveBalanceActivitiesResult');

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

export { AddressOrIndex, BalanceActivity, BalanceActivityCallback, BalanceActivityType, BalanceMonitorConfig, BalanceResult, BaseBroadcastResult, BaseConfig, BaseSignedTransaction, BaseTransactionInfo, BaseUnsignedTransaction, CreateTransactionOptions, FeeLevel, FeeLevelT, FeeOption, FeeOptionCustom, FeeOptionLevel, FeeRateType, FeeRateTypeT, GetBalanceActivityOptions, NetworkType, NetworkTypeT, PaymentsError, PaymentsErrorCode, Payport, ResolveablePayport, ResolvedFeeOption, RetrieveBalanceActivitiesResult, TransactionCommon, TransactionStatus, TransactionStatusT, createUnitConverters };
//# sourceMappingURL=index.es.js.map
