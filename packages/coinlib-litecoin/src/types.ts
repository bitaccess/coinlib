import * as t from 'io-ts'
import {
  BaseConfig, BaseUnsignedTransaction, BaseSignedTransaction, FeeRate,
  BaseTransactionInfo, BaseBroadcastResult, UtxoInfo, KeyPairsConfigParam,
} from '@bitaccess/coinlib-common'
import { extendCodec, enumCodec, requiredOptionalCodec, instanceofCodec } from '@faast/ts-common'
import { Signer as BitcoinjsSigner } from 'bitcoinjs-lib'
import { bitcoinish } from '@bitaccess/coinlib-bitcoin'
import { PsbtInput, TransactionInput } from 'bip174/src/lib/interfaces'

export enum LitecoinAddressFormat {
  Deprecated = 'deprecated',
  Modern = 'modern',
}
export const LitecoinAddressFormatT = enumCodec<LitecoinAddressFormat>(LitecoinAddressFormat, 'LitecoinAddressFormat')

export type LitecoinjsKeyPair = BitcoinjsSigner & {
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

// For unclear reasons tsc throws TS4023 when this type is used in an external module.
// Re-exporting the codec cast to the inferred type helps fix this.
const SinglesigAddressTypeT = t.keyof({
  [AddressType.Legacy]: null,
  [AddressType.SegwitP2SH]: null,
  [AddressType.SegwitNative]: null,
}, 'SinglesigAddressType')
export type SinglesigAddressType = t.TypeOf<typeof SinglesigAddressTypeT>
export const SinglesigAddressType = SinglesigAddressTypeT as t.Type<SinglesigAddressType>

const MultisigAddressTypeT = t.keyof({
  [AddressType.MultisigLegacy]: null,
  [AddressType.MultisigSegwitP2SH]: null,
  [AddressType.MultisigSegwitNative]: null,
}, 'MultisigAddressType')
export type MultisigAddressType = t.TypeOf<typeof MultisigAddressTypeT>
export const MultisigAddressType = MultisigAddressTypeT as t.Type<MultisigAddressType>

export const BitcoinishTxOutput = t.type({
  address: t.string,
  value: t.string,
}, 'BitcoinishTxOutput')
export type BitcoinishTxOutput = t.TypeOf<typeof BitcoinishTxOutput>


export const LitecoinBaseConfig = extendCodec(
  BaseConfig,
  {},
  {
    server: bitcoinish.BlockbookConfigServer,
    api: instanceofCodec(bitcoinish.BlockbookServerAPI),
  },
  'LitecoinBaseConfig',
)
export type LitecoinBaseConfig = t.TypeOf<typeof LitecoinBaseConfig>

export const LitecoinBalanceMonitorConfig = LitecoinBaseConfig
export type LitecoinBalanceMonitorConfig = LitecoinBaseConfig

export const LitecoinPaymentsUtilsConfig = extendCodec(
  LitecoinBaseConfig,
  {},
  {
    blockcypherToken: t.string,
    validAddressFormat: LitecoinAddressFormatT,
    feeLevelBlockTargets: bitcoinish.FeeLevelBlockTargets,
  },
  'LitecoinPaymentsUtilsConfig',
)
export type LitecoinPaymentsUtilsConfig = t.TypeOf<typeof LitecoinPaymentsUtilsConfig>

export const BaseLitecoinPaymentsConfig = extendCodec(
  LitecoinPaymentsUtilsConfig,
  {},
  {
    minTxFee: FeeRate,
    dustThreshold: t.number,
    networkMinRelayFee: t.number,
    targetUtxoPoolSize: t.number, // # of available utxos to try and maintain
    minChange: t.string, // Soft minimum for each change generated to maintain utxo pool
    maximumFeeRate: t.number, // Hard sat/byte fee cap passed to Psbt constructor
  },
  'BaseLitecoinPaymentsConfig',
)
export type BaseLitecoinPaymentsConfig = t.TypeOf<typeof BaseLitecoinPaymentsConfig>

export const HdLitecoinPaymentsConfig = extendCodec(
  BaseLitecoinPaymentsConfig,
  {
    hdKey: t.string,
  },
  {
    addressType: SinglesigAddressType,
    derivationPath: t.string,
  },
  'HdLitecoinPaymentsConfig',
)
export type HdLitecoinPaymentsConfig = t.TypeOf<typeof HdLitecoinPaymentsConfig>

export const KeyPairLitecoinPaymentsConfig = extendCodec(
  BaseLitecoinPaymentsConfig,
  {
    keyPairs: KeyPairsConfigParam,
  },
  {
    addressType: SinglesigAddressType,
  },
  'KeyPairLitecoinPaymentsConfig',
)
export type KeyPairLitecoinPaymentsConfig = t.TypeOf<typeof KeyPairLitecoinPaymentsConfig>

export const SinglesigLitecoinPaymentsConfig = t.union([
  HdLitecoinPaymentsConfig,
  KeyPairLitecoinPaymentsConfig,
], 'SinglesigLitecoinPaymentsConfig')
export type SinglesigLitecoinPaymentsConfig = t.TypeOf<typeof SinglesigLitecoinPaymentsConfig>

export const MultisigLitecoinPaymentsConfig = extendCodec(
  BaseLitecoinPaymentsConfig,
  {
    m: t.number,
    signers: t.array(SinglesigLitecoinPaymentsConfig),
  },
  {
    addressType: MultisigAddressType,
  },
  'MultisigLitecoinPaymentsConfig',
)
export type MultisigLitecoinPaymentsConfig = t.TypeOf<typeof MultisigLitecoinPaymentsConfig>

export const LitecoinPaymentsConfig = t.union([
  HdLitecoinPaymentsConfig,
  KeyPairLitecoinPaymentsConfig,
], 'LitecoinPaymentsConfig')
export type LitecoinPaymentsConfig = t.TypeOf<typeof LitecoinPaymentsConfig>

export const LitecoinUnsignedTransactionData = bitcoinish.BitcoinishPaymentTx
export type LitecoinUnsignedTransactionData = t.TypeOf<typeof LitecoinUnsignedTransactionData>

export const LitecoinUnsignedTransaction = extendCodec(
  BaseUnsignedTransaction,
  {
    amount: t.string,
    fee: t.string,
    data: LitecoinUnsignedTransactionData,
  },
  'LitecoinUnsignedTransaction',
)
export type LitecoinUnsignedTransaction = t.TypeOf<typeof LitecoinUnsignedTransaction>

export const LitecoinSignedTransactionData = requiredOptionalCodec(
  {
    hex: t.string,
  },
  {
    // true if `hex` is a partially signed transaction, false if it's finalized
    partial: t.boolean,
    // sha256 hash of the unsignedHex data for facilitating multisig tx combining
    unsignedTxHash: t.string,
    changeOutputs: t.array(BitcoinishTxOutput),
  },
  'LitecoinSignedTransactionData',
)
export type LitecoinSignedTransactionData = t.TypeOf<typeof LitecoinSignedTransactionData>

export const LitecoinSignedTransaction = extendCodec(
  BaseSignedTransaction,
  {
    data: LitecoinSignedTransactionData,
  },
  'LitecoinSignedTransaction',
)
export type LitecoinSignedTransaction = t.TypeOf<typeof LitecoinSignedTransaction>

export const LitecoinTransactionInfo = extendCodec(BaseTransactionInfo, {}, {}, 'LitecoinTransactionInfo')
export type LitecoinTransactionInfo = t.TypeOf<typeof LitecoinTransactionInfo>

export const LitecoinBroadcastResult = extendCodec(BaseBroadcastResult, {}, {}, 'LitecoinBroadcastResult')
export type LitecoinBroadcastResult = t.TypeOf<typeof LitecoinBroadcastResult>

export const LitecoinBlock = bitcoinish.BlockInfoBitcoin
export type LitecoinBlock = bitcoinish.BlockInfoBitcoin
