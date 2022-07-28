import { BlockbookServerAPI } from './bitcoinish/types'
import * as t from 'io-ts'
import {
  BaseConfig,
  BaseSignedTransaction,
  FeeRate,
  BaseBroadcastResult,
  KeyPairsConfigParam,
} from '@bitaccess/coinlib-common'
import { extendCodec, requiredOptionalCodec, instanceofCodec } from '@faast/ts-common'
import { BlockInfoBitcoin } from 'blockbook-client'
import {
  BitcoinishPaymentTx,
  BitcoinishTransactionInfo,
  BlockbookConfigServer,
  MultisigAddressType,
  SinglesigAddressType,
  BitcoinishTxOutput,
  BitcoinishUnsignedTransaction,
} from './bitcoinish'
import { PsbtInput, TransactionInput } from 'bip174-bigint/src/lib/interfaces'

export {
  AddressType,
  AddressTypeT,
  SinglesigAddressType,
  MultisigAddressType,
  BitcoinjsKeyPair,
  BitcoinjsNetwork,
} from './bitcoinish'

export interface PsbtInputData extends PsbtInput, TransactionInput {}

export const BitcoinBaseConfig = extendCodec(
  BaseConfig,
  {},
  {
    server: BlockbookConfigServer,
    api: instanceofCodec(BlockbookServerAPI),
  },
  'BitcoinBaseConfig',
)
export type BitcoinBaseConfig = t.TypeOf<typeof BitcoinBaseConfig>

export const BitcoinBalanceMonitorConfig = BitcoinBaseConfig
export type BitcoinBalanceMonitorConfig = BitcoinBaseConfig

export const BitcoinPaymentsUtilsConfig = extendCodec(
  BitcoinBaseConfig,
  {},
  {
    blockcypherToken: t.string,
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

export const SinglesigBitcoinPaymentsConfig = t.union(
  [HdBitcoinPaymentsConfig, KeyPairBitcoinPaymentsConfig],
  'SinglesigBitcoinPaymentsConfig',
)
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

export type PartialBitcoinPaymentsConfig = Partial<SinglesigBitcoinPaymentsConfig | MultisigBitcoinPaymentsConfig>

export const BitcoinPaymentsConfig = t.union(
  [HdBitcoinPaymentsConfig, KeyPairBitcoinPaymentsConfig, MultisigBitcoinPaymentsConfig],
  'BitcoinPaymentsConfig',
)
export type BitcoinPaymentsConfig = t.TypeOf<typeof BitcoinPaymentsConfig>

export const BitcoinUnsignedTransactionData = BitcoinishPaymentTx
export type BitcoinUnsignedTransactionData = t.TypeOf<typeof BitcoinUnsignedTransactionData>

export const BitcoinUnsignedTransaction = extendCodec(
  BitcoinishUnsignedTransaction,
  {
    amount: t.string,
    fee: t.string,
    data: BitcoinUnsignedTransactionData,
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
    changeOutputs: t.array(BitcoinishTxOutput),
  },
  'BitcoinSignedTransactionData',
)
export type BitcoinSignedTransactionData = t.TypeOf<typeof BitcoinSignedTransactionData>

export const BitcoinSignedTransaction = extendCodec(
  BaseSignedTransaction,
  {
    data: BitcoinSignedTransactionData,
  },
  'BitcoinSignedTransaction',
)
export type BitcoinSignedTransaction = t.TypeOf<typeof BitcoinSignedTransaction>

export const BitcoinTransactionInfo = extendCodec(BitcoinishTransactionInfo, {}, {}, 'BitcoinTransactionInfo')
export type BitcoinTransactionInfo = t.TypeOf<typeof BitcoinTransactionInfo>

export const BitcoinBroadcastResult = extendCodec(BaseBroadcastResult, {}, {}, 'BitcoinBroadcastResult')
export type BitcoinBroadcastResult = t.TypeOf<typeof BitcoinBroadcastResult>

export const BitcoinBlock = BlockInfoBitcoin
export type BitcoinBlock = BlockInfoBitcoin
