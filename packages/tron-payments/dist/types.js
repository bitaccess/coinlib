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
var payments_common_1 = require("@faast/payments-common");
exports.CreateTransactionOptions = payments_common_1.CreateTransactionOptions;
exports.BaseTronPaymentsConfig = t.partial({
    fullNode: t.string,
    solidityNode: t.string,
    eventServer: t.string,
}, 'BaseTronPaymentsConfig');
exports.HdTronPaymentsConfig = ts_common_1.extendCodec(exports.BaseTronPaymentsConfig, {
    hdKey: t.string,
}, {
    maxAddressScan: t.number,
}, 'HdTronPaymentsConfig');
exports.KeyPairTronPaymentsConfig = ts_common_1.extendCodec(exports.BaseTronPaymentsConfig, {
    keyPairs: t.union([t.array(t.union([t.string, t.null, t.undefined])), t.record(t.number, t.string)]),
}, {}, 'KeyPairTronPaymentsConfig');
exports.TronPaymentsConfig = t.union([exports.HdTronPaymentsConfig, exports.KeyPairTronPaymentsConfig]);
exports.TronUnsignedTransaction = ts_common_1.extendCodec(payments_common_1.BaseUnsignedTransaction, {
    id: t.string,
    amount: t.string,
    fee: t.string,
}, {}, 'TronUnsignedTransaction');
exports.TronSignedTransaction = ts_common_1.extendCodec(payments_common_1.BaseSignedTransaction, {}, {}, 'TronSignedTransaction');
exports.TronTransactionInfo = ts_common_1.extendCodec(payments_common_1.BaseTransactionInfo, {}, {}, 'TronTransactionInfo');
exports.TronBroadcastResult = ts_common_1.extendCodec(payments_common_1.BaseBroadcastResult, {
    rebroadcast: t.boolean,
}, {}, 'TronBroadcastResult');
exports.GetAddressOptions = t.partial({
    cacheIndex: t.boolean,
});
//# sourceMappingURL=types.js.map