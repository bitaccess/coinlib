import * as t from 'io-ts'
import {
  BaseConfig, BaseUnsignedTransaction, BaseSignedTransaction, FeeRate,
  BaseTransactionInfo, BaseBroadcastResult, UtxoInfo, KeyPairsConfigParam,
} from '@faast/payments-common'
import { extendCodec, enumCodec, requiredOptionalCodec } from '@faast/ts-common'
import { Signer as BitcoinjsSigner } from 'bitcoinjs-lib'
import { BlockInfoBitcoin } from 'blockbook-client'
import { BitcoinishPaymentTx, BlockbookConfigServer } from '@faast/bitcoin-payments'
import { PsbtInput, TransactionInput } from 'bip174/src/lib/interfaces'

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

export const BitcoinCashPaymentsUtilsConfig = extendCodec(
  BaseConfig,
  {},
  {
    server: BlockbookConfigServer,
  },
  'BitcoinCashPaymentsUtilsConfig',
)
export type BitcoinCashPaymentsUtilsConfig = t.TypeOf<typeof BitcoinCashPaymentsUtilsConfig>

export const BaseBitcoinCashPaymentsConfig = extendCodec(
  BitcoinCashPaymentsUtilsConfig,
  {},
  {
    minTxFee: FeeRate,
    dustThreshold: t.number,
    networkMinRelayFee: t.number,
    targetUtxoPoolSize: t.number, // # of available utxos to try and maintain
    minChange: t.string, // Soft minimum for each change generated to maintain utxo pool
    maximumFeeRate: t.number, // Hard sat/byte fee cap passed to Psbt constructor
  },
  'BaseBitcoinCashPaymentsConfig',
)
export type BaseBitcoinCashPaymentsConfig = t.TypeOf<typeof BaseBitcoinCashPaymentsConfig>

export const HdBitcoinCashPaymentsConfig = extendCodec(
  BaseBitcoinCashPaymentsConfig,
  {
    hdKey: t.string,
  },
  {
    addressType: SinglesigAddressType,
    derivationPath: t.string,
  },
  'HdBitcoinCashPaymentsConfig',
)
export type HdBitcoinCashPaymentsConfig = t.TypeOf<typeof HdBitcoinCashPaymentsConfig>

export const KeyPairBitcoinCashPaymentsConfig = extendCodec(
  BaseBitcoinCashPaymentsConfig,
  {
    keyPairs: KeyPairsConfigParam,
  },
  {
    addressType: SinglesigAddressType,
  },
  'KeyPairBitcoinCashPaymentsConfig',
)
export type KeyPairBitcoinCashPaymentsConfig = t.TypeOf<typeof KeyPairBitcoinCashPaymentsConfig>

export const SinglesigBitcoinCashPaymentsConfig = t.union([
  HdBitcoinCashPaymentsConfig,
  KeyPairBitcoinCashPaymentsConfig,
], 'SinglesigBitcoinCashPaymentsConfig')
export type SinglesigBitcoinCashPaymentsConfig = t.TypeOf<typeof SinglesigBitcoinCashPaymentsConfig>

export const BitcoinCashPaymentsConfig = t.union([
  HdBitcoinCashPaymentsConfig,
  KeyPairBitcoinCashPaymentsConfig,
], 'BitcoinCashPaymentsConfig')
export type BitcoinCashPaymentsConfig = t.TypeOf<typeof BitcoinCashPaymentsConfig>

export const BitcoinCashUnsignedTransactionData = BitcoinishPaymentTx
export type BitcoinCashUnsignedTransactionData = t.TypeOf<typeof BitcoinCashUnsignedTransactionData>

export const BitcoinCashUnsignedTransaction = extendCodec(
  BaseUnsignedTransaction,
  {
    amount: t.string,
    fee: t.string,
    data: BitcoinCashUnsignedTransactionData,
  },
  'BitcoinCashUnsignedTransaction',
)
export type BitcoinCashUnsignedTransaction = t.TypeOf<typeof BitcoinCashUnsignedTransaction>

export const BitcoinCashSignedTransactionData = requiredOptionalCodec(
  {
    hex: t.string,
  },
  {
    // true if `hex` is a partially signed transaction, false if it's finalized
    partial: t.boolean,
    // sha256 hash of the unsignedHex data for facilitating multisig tx combining
    unsignedTxHash: t.string,
  },
  'BitcoinCashSignedTransactionData',
)
export type BitcoinCashSignedTransactionData = t.TypeOf<typeof BitcoinCashSignedTransactionData>

export const BitcoinCashSignedTransaction = extendCodec(
  BaseSignedTransaction,
  {
    data: BitcoinCashSignedTransactionData,
  },
  'BitcoinCashSignedTransaction',
)
export type BitcoinCashSignedTransaction = t.TypeOf<typeof BitcoinCashSignedTransaction>

export const BitcoinCashTransactionInfo = extendCodec(BaseTransactionInfo, {}, {}, 'BitcoinCashTransactionInfo')
export type BitcoinCashTransactionInfo = t.TypeOf<typeof BitcoinCashTransactionInfo>

export const BitcoinCashBroadcastResult = extendCodec(BaseBroadcastResult, {}, {}, 'BitcoinCashBroadcastResult')
export type BitcoinCashBroadcastResult = t.TypeOf<typeof BitcoinCashBroadcastResult>

export const BitcoinCashBlock = BlockInfoBitcoin
export type BitcoinCashBlock = BlockInfoBitcoin
