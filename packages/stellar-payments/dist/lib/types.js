import * as t from 'io-ts';
import { extendCodec, instanceofCodec, nullable } from '@faast/ts-common';
import { BaseTransactionInfo, BaseUnsignedTransaction, BaseSignedTransaction, BaseBroadcastResult, CreateTransactionOptions, BaseConfig, } from '@faast/payments-common';
import * as Stellar from 'stellar-sdk';
export { CreateTransactionOptions };
export const BaseStellarConfig = extendCodec(BaseConfig, {}, {
    server: t.union([t.string, instanceofCodec(Stellar.Server), t.nullType]),
}, 'BaseStellarConfig');
export const StellarBalanceMonitorConfig = BaseStellarConfig;
export const BaseStellarPaymentsConfig = extendCodec(BaseStellarConfig, {}, {
    txTimeoutSeconds: t.number,
}, 'BaseStellarPaymentsConfig');
export const HdStellarPaymentsConfig = extendCodec(BaseStellarPaymentsConfig, {
    seed: t.string,
}, 'HdStellarPaymentsConfig');
export const StellarSignatory = t.type({
    address: t.string,
    secret: t.string,
}, 'StellarSignatory');
export const PartialStellarSignatory = t.partial(StellarSignatory.props, 'PartialStellarSignatory');
export const StellarAccountConfig = t.union([
    t.string, PartialStellarSignatory,
], 'StellarAccountConfig');
export const AccountStellarPaymentsConfig = extendCodec(BaseStellarPaymentsConfig, {
    hotAccount: StellarAccountConfig,
    depositAccount: StellarAccountConfig,
}, 'AccountStellarPaymentsConfig');
export const StellarPaymentsConfig = t.union([HdStellarPaymentsConfig, AccountStellarPaymentsConfig], 'StellarPaymentsConfig');
export const StellarUnsignedTransaction = extendCodec(BaseUnsignedTransaction, {
    amount: t.string,
    fee: t.string,
}, 'StellarUnsignedTransaction');
export const StellarSignedTransaction = extendCodec(BaseSignedTransaction, {}, 'StellarSignedTransaction');
export const StellarTransactionInfo = extendCodec(BaseTransactionInfo, {
    confirmationNumber: nullable(t.number),
}, {}, 'StellarTransactionInfo');
export const StellarBroadcastResult = extendCodec(BaseBroadcastResult, {
    rebroadcast: t.boolean,
    data: t.object,
}, 'StellarBroadcastResult');
export const StellarCreateTransactionOptions = extendCodec(CreateTransactionOptions, {}, {
    timeoutSeconds: t.number,
}, 'StellarCreateTransactionOptions');
//# sourceMappingURL=types.js.map