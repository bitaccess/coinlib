import * as t from 'io-ts';
import { BaseTransactionInfo, BaseUnsignedTransaction, BaseSignedTransaction, BaseBroadcastResult, extend, } from 'payments-common';
export var BaseTronPaymentsConfig = t.partial({
    fullNode: t.string,
    solidityNode: t.string,
    eventServer: t.string,
}, 'BaseTronPaymentsConfig');
export var HdTronPaymentsConfig = extend(BaseTronPaymentsConfig, {
    hdKey: t.string,
}, {
    maxAddressScan: t.number,
}, 'HdTronPaymentsConfig');
export var KeyPairTronPaymentsConfig = extend(BaseTronPaymentsConfig, {
    keyPairs: t.union([
        t.array(t.union([t.string, t.null, t.undefined])),
        t.record(t.number, t.string),
    ]),
}, {}, 'KeyPairTronPaymentsConfig');
export var TronPaymentsConfig = t.union([HdTronPaymentsConfig, KeyPairTronPaymentsConfig]);
export var TronUnsignedTransaction = extend(BaseUnsignedTransaction, {
    id: t.string,
    amount: t.string,
    fee: t.string,
}, {}, 'TronUnsignedTransaction');
export var TronSignedTransaction = extend(BaseSignedTransaction, {}, {}, 'TronSignedTransaction');
export var TronTransactionInfo = extend(BaseTransactionInfo, {
    from: t.string,
    to: t.string,
}, {}, 'TronTransactionInfo');
export var TronBroadcastResult = extend(BaseBroadcastResult, {
    rebroadcast: t.boolean,
}, {}, 'TronBroadcastResult');
export var CreateTransactionOptions = t.partial({
    fee: t.number,
});
export var GetAddressOptions = t.partial({
    cacheIndex: t.boolean,
});
//# sourceMappingURL=types.js.map