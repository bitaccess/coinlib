"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var t = __importStar(require("io-ts"));
var ts_common_1 = require("@faast/ts-common");
exports.AddressOrIndex = t.union([t.string, t.number], 'AddressOrIndex');
var FeeLevel;
(function (FeeLevel) {
    FeeLevel["Custom"] = "custom";
    FeeLevel["Low"] = "low";
    FeeLevel["Medium"] = "medium";
    FeeLevel["High"] = "high";
})(FeeLevel = exports.FeeLevel || (exports.FeeLevel = {}));
exports.FeeLevelT = ts_common_1.enumCodec(FeeLevel, 'FeeLevel');
var FeeRateType;
(function (FeeRateType) {
    FeeRateType["Main"] = "main";
    FeeRateType["Base"] = "base";
    FeeRateType["BasePerWeight"] = "base/weight";
})(FeeRateType = exports.FeeRateType || (exports.FeeRateType = {}));
exports.FeeRateTypeT = ts_common_1.enumCodec(FeeRateType, 'FeeRateType');
exports.FeeOptionCustom = ts_common_1.requiredOptionalCodec({
    feeRate: t.string,
    feeRateType: exports.FeeRateTypeT,
}, {
    feeLevel: t.literal(FeeLevel.Custom),
}, 'FeeOptionCustom');
exports.FeeOptionLevel = t.type({
    feeLevel: t.union([t.literal(FeeLevel.High), t.literal(FeeLevel.Medium), t.literal(FeeLevel.Low)]),
}, 'FeeOptionLevel');
exports.FeeOption = t.union([exports.FeeOptionCustom, exports.FeeOptionLevel], 'FeeOption');
exports.CreateTransactionOptions = exports.FeeOption;
exports.ResolvedFeeOption = t.type({
    targetFeeLevel: exports.FeeLevelT,
    targetFeeRate: t.string,
    targetFeeRateType: exports.FeeRateTypeT,
    feeBase: t.string,
    feeMain: t.string,
});
exports.BalanceResult = t.type({
    balance: t.string,
    unconfirmedBalance: t.string,
}, 'BalanceResult');
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["Unsigned"] = "unsigned";
    TransactionStatus["Signed"] = "signed";
    TransactionStatus["Pending"] = "pending";
    TransactionStatus["Confirmed"] = "confirmed";
    TransactionStatus["Failed"] = "failed";
})(TransactionStatus = exports.TransactionStatus || (exports.TransactionStatus = {}));
exports.TransactionStatusT = ts_common_1.enumCodec(TransactionStatus, 'TransactionStatus');
exports.TransactionCommon = t.type({
    id: ts_common_1.nullable(t.string),
    fromAddress: ts_common_1.nullable(t.string),
    toAddress: ts_common_1.nullable(t.string),
    toExtraId: ts_common_1.nullable(t.string),
    fromIndex: ts_common_1.nullable(t.number),
    toIndex: ts_common_1.nullable(t.number),
    amount: ts_common_1.nullable(t.string),
    fee: ts_common_1.nullable(t.string),
    status: exports.TransactionStatusT,
}, 'TransactionCommon');
var UnsignedCommon = ts_common_1.extendCodec(exports.TransactionCommon, {
    fromAddress: t.string,
    toAddress: t.string,
    fromIndex: t.number,
    targetFeeLevel: exports.FeeLevelT,
    targetFeeRate: ts_common_1.nullable(t.string),
    targetFeeRateType: ts_common_1.nullable(exports.FeeRateTypeT),
}, 'UnsignedCommon');
exports.BaseUnsignedTransaction = ts_common_1.extendCodec(UnsignedCommon, {
    status: t.literal('unsigned'),
    data: t.UnknownRecord,
}, 'BaseUnsignedTransaction');
exports.BaseSignedTransaction = ts_common_1.extendCodec(UnsignedCommon, {
    status: t.literal('signed'),
    id: t.string,
    amount: t.string,
    fee: t.string,
    data: t.UnknownRecord,
}, 'BaseSignedTransaction');
exports.BaseTransactionInfo = ts_common_1.extendCodec(exports.TransactionCommon, {
    id: t.string,
    amount: t.string,
    fee: t.string,
    isExecuted: t.boolean,
    isConfirmed: t.boolean,
    confirmations: t.number,
    block: ts_common_1.nullable(t.number),
    date: ts_common_1.nullable(ts_common_1.DateT),
    data: t.UnknownRecord,
}, 'BaseTransactionInfo');
exports.BaseBroadcastResult = t.type({
    id: t.string,
}, 'BaseBroadcastResult');
//# sourceMappingURL=types.js.map