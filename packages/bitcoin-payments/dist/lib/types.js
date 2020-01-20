import * as t from 'io-ts';
import { BaseConfig, BaseUnsignedTransaction, BaseSignedTransaction, FeeRate, BaseTransactionInfo, BaseBroadcastResult, UtxoInfo, } from '@faast/payments-common';
import { extendCodec, enumCodec } from '@faast/ts-common';
import { BlockInfoBitcoin } from 'blockbook-client';
import { BitcoinishPaymentTx, BlockbookConfigServer } from './bitcoinish';
export { UtxoInfo };
export * from './bitcoinish/types';
export var AddressType;
(function (AddressType) {
    AddressType["Legacy"] = "p2pkh";
    AddressType["SegwitP2SH"] = "p2sh-p2wpkh";
    AddressType["SegwitNative"] = "p2wpkh";
})(AddressType || (AddressType = {}));
export const AddressTypeT = enumCodec(AddressType, 'AddressType');
export const BitcoinPaymentsUtilsConfig = extendCodec(BaseConfig, {}, {
    server: BlockbookConfigServer,
}, 'BitcoinPaymentsUtilsConfig');
export const BaseBitcoinPaymentsConfig = extendCodec(BitcoinPaymentsUtilsConfig, {}, {
    addressType: AddressTypeT,
    minTxFee: FeeRate,
    dustThreshold: t.number,
    networkMinRelayFee: t.number,
}, 'BaseBitcoinPaymentsConfig');
export const HdBitcoinPaymentsConfig = extendCodec(BaseBitcoinPaymentsConfig, {
    hdKey: t.string,
}, {
    derivationPath: t.string,
}, 'HdBitcoinPaymentsConfig');
export const BitcoinPaymentsConfig = HdBitcoinPaymentsConfig;
export const BitcoinUnsignedTransactionData = BitcoinishPaymentTx;
export const BitcoinUnsignedTransaction = extendCodec(BaseUnsignedTransaction, {
    amount: t.string,
    fee: t.string,
    data: BitcoinUnsignedTransactionData,
}, 'BitcoinUnsignedTransaction');
export const BitcoinSignedTransaction = extendCodec(BaseSignedTransaction, {
    data: t.type({
        hex: t.string,
    }),
}, {}, 'BitcoinSignedTransaction');
export const BitcoinTransactionInfo = extendCodec(BaseTransactionInfo, {}, {}, 'BitcoinTransactionInfo');
export const BitcoinBroadcastResult = extendCodec(BaseBroadcastResult, {}, {}, 'BitcoinBroadcastResult');
export const BitcoinBlock = BlockInfoBitcoin;
//# sourceMappingURL=types.js.map