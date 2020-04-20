import * as t from 'io-ts';
import { BaseConfig, BaseUnsignedTransaction, BaseSignedTransaction, FeeRate, BaseTransactionInfo, BaseBroadcastResult, UtxoInfo, KeyPairsConfigParam, } from '@faast/payments-common';
import { extendCodec, enumCodec, requiredOptionalCodec } from '@faast/ts-common';
import { BlockInfoBitcoin } from 'blockbook-client';
import { BitcoinishPaymentTx, BlockbookConfigServer } from './bitcoinish';
export { UtxoInfo };
export * from './bitcoinish/types';
export var AddressType;
(function (AddressType) {
    AddressType["Legacy"] = "p2pkh";
    AddressType["SegwitP2SH"] = "p2sh-p2wpkh";
    AddressType["SegwitNative"] = "p2wpkh";
    AddressType["MultisigLegacy"] = "p2sh-p2ms";
    AddressType["MultisigSegwitP2SH"] = "p2sh-p2wsh-p2ms";
    AddressType["MultisigSegwitNative"] = "p2wsh-p2ms";
})(AddressType || (AddressType = {}));
export const AddressTypeT = enumCodec(AddressType, 'AddressType');
const SinglesigAddressTypeT = t.keyof({
    [AddressType.Legacy]: null,
    [AddressType.SegwitP2SH]: null,
    [AddressType.SegwitNative]: null,
}, 'SinglesigAddressType');
export const SinglesigAddressType = SinglesigAddressTypeT;
const MultisigAddressTypeT = t.keyof({
    [AddressType.MultisigLegacy]: null,
    [AddressType.MultisigSegwitP2SH]: null,
    [AddressType.MultisigSegwitNative]: null,
}, 'MultisigAddressType');
export const MultisigAddressType = MultisigAddressTypeT;
export const BitcoinPaymentsUtilsConfig = extendCodec(BaseConfig, {}, {
    server: BlockbookConfigServer,
}, 'BitcoinPaymentsUtilsConfig');
export const BaseBitcoinPaymentsConfig = extendCodec(BitcoinPaymentsUtilsConfig, {}, {
    minTxFee: FeeRate,
    dustThreshold: t.number,
    networkMinRelayFee: t.number,
    targetUtxoPoolSize: t.number,
    minChange: t.string,
    maximumFeeRate: t.number,
}, 'BaseBitcoinPaymentsConfig');
export const HdBitcoinPaymentsConfig = extendCodec(BaseBitcoinPaymentsConfig, {
    hdKey: t.string,
}, {
    addressType: SinglesigAddressType,
    derivationPath: t.string,
}, 'HdBitcoinPaymentsConfig');
export const KeyPairBitcoinPaymentsConfig = extendCodec(BaseBitcoinPaymentsConfig, {
    keyPairs: KeyPairsConfigParam,
}, {
    addressType: SinglesigAddressType,
}, 'KeyPairBitcoinPaymentsConfig');
export const SinglesigBitcoinPaymentsConfig = t.union([
    HdBitcoinPaymentsConfig,
    KeyPairBitcoinPaymentsConfig,
], 'SinglesigBitcoinPaymentsConfig');
export const MultisigBitcoinPaymentsConfig = extendCodec(BaseBitcoinPaymentsConfig, {
    m: t.number,
    signers: t.array(SinglesigBitcoinPaymentsConfig),
}, {
    addressType: MultisigAddressType,
}, 'MultisigBitcoinPaymentsConfig');
export const BitcoinPaymentsConfig = t.union([
    HdBitcoinPaymentsConfig,
    KeyPairBitcoinPaymentsConfig,
    MultisigBitcoinPaymentsConfig,
], 'BitcoinPaymentsConfig');
export const BitcoinUnsignedTransactionData = BitcoinishPaymentTx;
export const BitcoinMultisigDataSigner = requiredOptionalCodec({
    accountId: t.string,
    index: t.number,
    publicKey: t.string,
}, {
    signed: t.boolean,
}, 'BitcoinMultisigDataSigner');
export const BitcoinMultisigData = t.type({
    m: t.number,
    signers: t.array(BitcoinMultisigDataSigner),
}, 'BitcoinMultisigData');
export const BitcoinUnsignedTransaction = extendCodec(BaseUnsignedTransaction, {
    amount: t.string,
    fee: t.string,
    data: BitcoinUnsignedTransactionData,
}, {
    multisigData: BitcoinMultisigData,
}, 'BitcoinUnsignedTransaction');
export const BitcoinSignedTransactionData = requiredOptionalCodec({
    hex: t.string,
}, {
    partial: t.boolean,
    unsignedTxHash: t.string,
}, 'BitcoinSignedTransactionData');
export const BitcoinSignedTransaction = extendCodec(BaseSignedTransaction, {
    data: BitcoinSignedTransactionData,
}, {
    multisigData: BitcoinMultisigData,
}, 'BitcoinSignedTransaction');
export const BitcoinTransactionInfo = extendCodec(BaseTransactionInfo, {}, {}, 'BitcoinTransactionInfo');
export const BitcoinBroadcastResult = extendCodec(BaseBroadcastResult, {}, {}, 'BitcoinBroadcastResult');
export const BitcoinBlock = BlockInfoBitcoin;
//# sourceMappingURL=types.js.map