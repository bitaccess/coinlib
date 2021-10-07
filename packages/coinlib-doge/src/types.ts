import * as t from 'io-ts'
import {
  BaseConfig, BaseUnsignedTransaction, BaseSignedTransaction, FeeRate,
  BaseTransactionInfo, BaseBroadcastResult, KeyPairsConfigParam,
} from '@bitaccess/coinlib-common'
import { extendCodec, enumCodec, requiredOptionalCodec, instanceofCodec } from '@faast/ts-common'
import { Signer as BitcoinjsSigner } from 'bitcoinjs-lib-bigint'
import { bitcoinish } from '@bitaccess/coinlib-bitcoin'
import { PsbtInput, TransactionInput } from 'bip174-bigint/src/lib/interfaces'

export type BitcoinjsKeyPair = BitcoinjsSigner & {
  privateKey?: Buffer
  toWIF(): string
}

export interface PsbtInputData extends PsbtInput, TransactionInput {}

export enum AddressType {
  Legacy = 'p2pkh',
}
export const AddressTypeT = enumCodec<AddressType>(AddressType, 'AddressType')

// For unclear reasons tsc throws TS4023 when this type is used in an external module.
// Re-exporting the codec cast to the inferred type helps fix this.
const SinglesigAddressTypeT = t.keyof({
  [AddressType.Legacy]: null,
}, 'SinglesigAddressType')
export type SinglesigAddressType = t.TypeOf<typeof SinglesigAddressTypeT>
export const SinglesigAddressType = SinglesigAddressTypeT as t.Type<SinglesigAddressType>

export const DogeBaseConfig = extendCodec(
  BaseConfig,
  {},
  {
    server: bitcoinish.BlockbookConfigServer,
    api: instanceofCodec(bitcoinish.BlockbookServerAPI),
  },
  'DogeBaseConfig',
)
export type DogeBaseConfig = t.TypeOf<typeof DogeBaseConfig>

export const DogeBalanceMonitorConfig = DogeBaseConfig
export type DogeBalanceMonitorConfig = DogeBaseConfig

export const DogePaymentsUtilsConfig = extendCodec(
  DogeBaseConfig,
  {},
  {
    blockcypherToken: t.string,
    feeLevelBlockTargets: bitcoinish.FeeLevelBlockTargets,
  },
  'DogePaymentsUtilsConfig',
)
export type DogePaymentsUtilsConfig = t.TypeOf<typeof DogePaymentsUtilsConfig>

export const BaseDogePaymentsConfig = extendCodec(
  DogePaymentsUtilsConfig,
  {},
  {
    minTxFee: FeeRate,
    dustThreshold: t.number,
    networkMinRelayFee: t.number,
    targetUtxoPoolSize: t.number, // # of available utxos to try and maintain
    minChange: t.string, // Soft minimum for each change generated to maintain utxo pool
    maximumFeeRate: t.number, // Hard sat/byte fee cap passed to Psbt constructor
  },
  'BaseDogePaymentsConfig',
)
export type BaseDogePaymentsConfig = t.TypeOf<typeof BaseDogePaymentsConfig>

export const HdDogePaymentsConfig = extendCodec(
  BaseDogePaymentsConfig,
  {
    hdKey: t.string,
  },
  {
    addressType: SinglesigAddressType,
    derivationPath: t.string,
  },
  'HdDogePaymentsConfig',
)
export type HdDogePaymentsConfig = t.TypeOf<typeof HdDogePaymentsConfig>

export const KeyPairDogePaymentsConfig = extendCodec(
  BaseDogePaymentsConfig,
  {
    keyPairs: KeyPairsConfigParam,
  },
  {
    addressType: SinglesigAddressType,
  },
  'KeyPairDogePaymentsConfig',
)
export type KeyPairDogePaymentsConfig = t.TypeOf<typeof KeyPairDogePaymentsConfig>

export const SinglesigDogePaymentsConfig = t.union([
  HdDogePaymentsConfig,
  KeyPairDogePaymentsConfig,
], 'SinglesigDogePaymentsConfig')
export type SinglesigDogePaymentsConfig = t.TypeOf<typeof SinglesigDogePaymentsConfig>

export const DogePaymentsConfig = t.union([
  HdDogePaymentsConfig,
  KeyPairDogePaymentsConfig,
], 'DogePaymentsConfig')
export type DogePaymentsConfig = t.TypeOf<typeof DogePaymentsConfig>

export const DogeUnsignedTransactionData = bitcoinish.BitcoinishPaymentTx
export type DogeUnsignedTransactionData = t.TypeOf<typeof DogeUnsignedTransactionData>

export const DogeUnsignedTransaction = extendCodec(
  BaseUnsignedTransaction,
  {
    amount: t.string,
    fee: t.string,
    data: DogeUnsignedTransactionData,
  },
  'DogeUnsignedTransaction',
)
export type DogeUnsignedTransaction = t.TypeOf<typeof DogeUnsignedTransaction>

export const DogeSignedTransactionData = requiredOptionalCodec(
  {
    hex: t.string,
  },
  {
    // true if `hex` is a partially signed transaction, false if it's finalized
    partial: t.boolean,
    // sha256 hash of the unsignedHex data for facilitating multisig tx combining
    unsignedTxHash: t.string,
  },
  'DogeSignedTransactionData',
)
export type DogeSignedTransactionData = t.TypeOf<typeof DogeSignedTransactionData>

export const DogeSignedTransaction = extendCodec(
  BaseSignedTransaction,
  {
    data: DogeSignedTransactionData,
  },
  'DogeSignedTransaction',
)
export type DogeSignedTransaction = t.TypeOf<typeof DogeSignedTransaction>

export const DogeTransactionInfo = extendCodec(BaseTransactionInfo, {}, {}, 'DogeTransactionInfo')
export type DogeTransactionInfo = t.TypeOf<typeof DogeTransactionInfo>

export const DogeBroadcastResult = extendCodec(BaseBroadcastResult, {}, {}, 'DogeBroadcastResult')
export type DogeBroadcastResult = t.TypeOf<typeof DogeBroadcastResult>

export const DogeBlock = bitcoinish.BlockInfoBitcoin
export type DogeBlock = bitcoinish.BlockInfoBitcoin
