import * as t from 'io-ts'
import {
  BaseConfig, BaseUnsignedTransaction, BaseSignedTransaction, FeeRate,
  BaseTransactionInfo, BaseBroadcastResult, UtxoInfo, KeyPairsConfigParam,
} from '@faast/payments-common'
import { extendCodec, enumCodec, requiredOptionalCodec } from '@faast/ts-common'
import { Network as BitcoinjsNetwork, Signer as BitcoinjsSigner } from 'bitcoinjs-lib'
import { BlockInfoBitcoin } from 'blockbook-client'
import { BitcoinishPaymentTx, BlockbookConfigServer } from './bitcoinish'
import { PsbtInput, TransactionInput } from 'bip174/src/lib/interfaces'

export { BitcoinjsNetwork, UtxoInfo }
export * from './bitcoinish/types'

export type BitcoinjsKeyPair = BitcoinjsSigner & {
  privateKey?: Buffer
  toWIF(): string
}

export interface PsbtInputData extends PsbtInput, TransactionInput {}

export enum AddressType {
  Legacy = 'p2pkh',
  SegwitP2SH = 'p2sh-p2wpkh',
  SegwitNative = 'p2wpkh',
  MultisigLegacy = 'p2sh-p2ms',
  MultisigSegwitP2SH = 'p2sh-p2wsh-p2ms',
  MultisigSegwitNative = 'p2wsh-p2ms'
}
export const AddressTypeT = enumCodec<AddressType>(AddressType, 'AddressType')

export const SinglesigAddressType = t.keyof({
  [AddressType.Legacy]: null,
  [AddressType.SegwitP2SH]: null,
  [AddressType.SegwitNative]: null,
}, 'SinglesigAddressType')
export type SinglesigAddressType = t.TypeOf<typeof SinglesigAddressType>

export const MultisigAddressType = t.keyof({
  [AddressType.MultisigLegacy]: null,
  [AddressType.MultisigSegwitP2SH]: null,
  [AddressType.MultisigSegwitNative]: null,
}, 'MultisigAddressType')
export type MultisigAddressType = t.TypeOf<typeof MultisigAddressType>

export const BitcoinPaymentsUtilsConfig = extendCodec(
  BaseConfig,
  {},
  {
    server: BlockbookConfigServer,
  },
  'BitcoinPaymentsUtilsConfig',
)
export type BitcoinPaymentsUtilsConfig = t.TypeOf<typeof BitcoinPaymentsUtilsConfig>

export const BaseBitcoinPaymentsConfig = extendCodec(
  BitcoinPaymentsUtilsConfig,
  {},
  {
    minTxFee: FeeRate,
    dustThreshold: t.number,
    networkMinRelayFee: t.number,
    targetUtxoPoolSize: t.number, // # of available utxos to try and maintain
    minChange: t.string, // Soft minimum for each change generated to maintain utxo pool
    maximumFeeRate: t.number, // Hard sat/byte fee cap passed to Psbt constructor
  },
  'BaseBitcoinPaymentsConfig',
)
export type BaseBitcoinPaymentsConfig = t.TypeOf<typeof BaseBitcoinPaymentsConfig>

export const HdBitcoinPaymentsConfig = extendCodec(
  BaseBitcoinPaymentsConfig,
  {
    hdKey: t.string,
  },
  {
    addressType: SinglesigAddressType,
    derivationPath: t.string,
  },
  'HdBitcoinPaymentsConfig',
)
export type HdBitcoinPaymentsConfig = t.TypeOf<typeof HdBitcoinPaymentsConfig>

export const KeyPairBitcoinPaymentsConfig = extendCodec(
  BaseBitcoinPaymentsConfig,
  {
    keyPairs: KeyPairsConfigParam,
  },
  {
    addressType: SinglesigAddressType,
  },
  'KeyPairBitcoinPaymentsConfig',
)
export type KeyPairBitcoinPaymentsConfig = t.TypeOf<typeof KeyPairBitcoinPaymentsConfig>

export const SinglesigBitcoinPaymentsConfig = t.union([
  HdBitcoinPaymentsConfig,
  KeyPairBitcoinPaymentsConfig,
], 'SinglesigBitcoinPaymentsConfig')
export type SinglesigBitcoinPaymentsConfig = t.TypeOf<typeof SinglesigBitcoinPaymentsConfig>

export const MultisigBitcoinPaymentsConfig = extendCodec(
  BaseBitcoinPaymentsConfig,
  {
    m: t.number,
    signers: t.array(SinglesigBitcoinPaymentsConfig),
  },
  {
    addressType: MultisigAddressType,
  },
  'MultisigBitcoinPaymentsConfig',
)
export type MultisigBitcoinPaymentsConfig = t.TypeOf<typeof MultisigBitcoinPaymentsConfig>

export const BitcoinPaymentsConfig = t.union([
  HdBitcoinPaymentsConfig,
  KeyPairBitcoinPaymentsConfig,
  MultisigBitcoinPaymentsConfig,
], 'BitcoinPaymentsConfig')
export type BitcoinPaymentsConfig = t.TypeOf<typeof BitcoinPaymentsConfig>

export const BitcoinUnsignedTransactionData = BitcoinishPaymentTx
export type BitcoinUnsignedTransactionData = t.TypeOf<typeof BitcoinUnsignedTransactionData>

export const BitcoinMultisigDataSigner = requiredOptionalCodec(
  {
    accountId: t.string,
    index: t.number,
    publicKey: t.string,
  },
  {
    signed: t.boolean,
  },
  'BitcoinMultisigDataSigner',
)
export type BitcoinMultisigDataSigner = t.TypeOf<typeof BitcoinMultisigDataSigner>

export const BitcoinMultisigData = t.type(
  {
    m: t.number,
    signers: t.array(BitcoinMultisigDataSigner),
  },
  'BitcoinMultisigData',
)
export type BitcoinMultisigData = t.TypeOf<typeof BitcoinMultisigData>

export const BitcoinUnsignedTransaction = extendCodec(
  BaseUnsignedTransaction,
  {
    amount: t.string,
    fee: t.string,
    data: BitcoinUnsignedTransactionData,
  },
  {
    multisigData: BitcoinMultisigData,
  },
  'BitcoinUnsignedTransaction',
)
export type BitcoinUnsignedTransaction = t.TypeOf<typeof BitcoinUnsignedTransaction>

export const BitcoinSignedTransactionData = requiredOptionalCodec(
  {
    hex: t.string,
  },
  {
    // true if `hex` is a partially signed transaction, false if it's finalized
    partial: t.boolean,
    // sha256 hash of the unsignedHex data for facilitating multisig tx combining
    unsignedTxHash: t.string,
  },
  'BitcoinSignedTransactionData',
)
export type BitcoinSignedTransactionData = t.TypeOf<typeof BitcoinSignedTransactionData>

export const BitcoinSignedTransaction = extendCodec(
  BaseSignedTransaction,
  {
    data: BitcoinSignedTransactionData,
  },
  {
    multisigData: BitcoinMultisigData,
  },
  'BitcoinSignedTransaction',
)
export type BitcoinSignedTransaction = t.TypeOf<typeof BitcoinSignedTransaction>

export const BitcoinTransactionInfo = extendCodec(BaseTransactionInfo, {}, {}, 'BitcoinTransactionInfo')
export type BitcoinTransactionInfo = t.TypeOf<typeof BitcoinTransactionInfo>

export const BitcoinBroadcastResult = extendCodec(BaseBroadcastResult, {}, {}, 'BitcoinBroadcastResult')
export type BitcoinBroadcastResult = t.TypeOf<typeof BitcoinBroadcastResult>

export const BitcoinBlock = BlockInfoBitcoin
export type BitcoinBlock = BlockInfoBitcoin
