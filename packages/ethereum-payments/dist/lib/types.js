import * as t from 'io-ts';
import { extendCodec } from '@faast/ts-common';
import { BaseTransactionInfo, BaseUnsignedTransaction, BaseSignedTransaction, BaseBroadcastResult, BaseConfig, ResolvedFeeOption, } from '@faast/payments-common';
const keys = t.type({
    pub: t.string,
    prv: t.string,
});
const xkeys = t.type({
    xprv: t.string,
    xpub: t.string,
});
const NullableOptionalString = t.union([t.string, t.null, t.undefined]);
const OptionalString = t.union([t.string, t.undefined]);
export const EthereumSignatory = t.type({
    address: t.string,
    keys,
    xkeys,
}, 'EthereumSignatory');
export const BaseEthereumPaymentsConfig = extendCodec(BaseConfig, {}, {
    fullNode: OptionalString,
    parityNode: OptionalString,
    gasStation: OptionalString,
}, 'BaseEthereumPaymentsConfig');
export const HdEthereumPaymentsConfig = extendCodec(BaseEthereumPaymentsConfig, {
    hdKey: t.string,
}, 'HdEthereumPaymentsConfig');
export const KeyPairEthereumPaymentsConfig = extendCodec(BaseEthereumPaymentsConfig, {
    keyPairs: t.union([t.array(NullableOptionalString), t.record(t.number, NullableOptionalString)]),
}, 'KeyPairEthereumPaymentsConfig');
export const EthereumPaymentsConfig = t.union([HdEthereumPaymentsConfig, KeyPairEthereumPaymentsConfig], 'EthereumPaymentsConfig');
export const EthereumUnsignedTransaction = extendCodec(BaseUnsignedTransaction, {
    id: t.string,
    amount: t.string,
    fee: t.string,
}, 'EthereumUnsignedTransaction');
export const EthereumSignedTransaction = extendCodec(BaseSignedTransaction, {
    data: t.type({
        hex: t.string
    }),
}, {}, 'EthereumSignedTransaction');
export const EthereumTransactionInfo = extendCodec(BaseTransactionInfo, {}, {}, 'EthereumTransactionInfo');
export const EthereumBroadcastResult = extendCodec(BaseBroadcastResult, {}, 'EthereumBroadcastResult');
export const EthereumResolvedFeeOption = extendCodec(ResolvedFeeOption, {
    gasPrice: t.string,
}, 'EthereumResolvedFeeOption');
const BnRounding = t.union([
    t.literal(1),
    t.literal(2),
    t.literal(3),
    t.literal(4),
    t.literal(5),
    t.literal(6),
    t.literal(7),
    t.literal(8),
]);
export const BaseDenominationOptions = extendCodec(t.object, {}, {
    rounding: BnRounding
}, 'BaseDenominationOptions');
//# sourceMappingURL=types.js.map