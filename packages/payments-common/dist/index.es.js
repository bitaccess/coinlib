import { partial, union, string, number, literal, type, boolean, object } from 'io-ts';
import BigNumber from 'bignumber.js';
import { requiredOptionalCodec, extendCodec, enumCodec, nullable, DateT, Logger, functionT, DelegateLogger } from '@faast/ts-common';

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
    id: nullable(string),
    fromAddress: nullable(string),
    toAddress: nullable(string),
    fromIndex: nullable(number),
    toIndex: nullable(number),
    amount: nullable(string),
    fee: nullable(string),
    status: TransactionStatusT,
}, {
    fromExtraId: nullable(string),
    toExtraId: nullable(string),
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
    confirmationNumber: number,
    timestamp: DateT,
}, 'BalanceActivity');
const BalanceMonitorConfig = requiredOptionalCodec({
    network: NetworkTypeT,
}, {
    logger: Logger,
}, 'BalanceMonitorConfig');
const GetBalanceActivityOptions = partial({
    from: BalanceActivity,
    to: BalanceActivity,
}, 'GetBalanceActivityOptions');
const BalanceActivityCallback = functionT('BalanceActivityCallback');

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

class BalanceMonitor {
    constructor(config) {
        this.networkType = config.network;
        this.logger = new DelegateLogger(config.logger, BalanceMonitor.name);
    }
}

export { NetworkType, NetworkTypeT, BaseConfig, AddressOrIndex, FeeLevel, FeeLevelT, FeeRateType, FeeRateTypeT, FeeOptionCustom, FeeOptionLevel, FeeOption, CreateTransactionOptions, ResolvedFeeOption, BalanceResult, TransactionStatus, TransactionStatusT, TransactionCommon, BaseUnsignedTransaction, BaseSignedTransaction, BaseTransactionInfo, BaseBroadcastResult, Payport, BalanceActivityType, BalanceActivity, BalanceMonitorConfig, GetBalanceActivityOptions, BalanceActivityCallback, createUnitConverters, BalanceMonitor };
//# sourceMappingURL=index.es.js.map
