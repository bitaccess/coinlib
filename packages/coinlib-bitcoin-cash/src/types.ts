import * as t from 'io-ts'
import {
  BaseConfig,
  BaseUnsignedTransaction,
  BaseSignedTransaction,
  FeeRate,
  BaseTransactionInfo,
  BaseBroadcastResult,
  UtxoInfo,
  KeyPairsConfigParam,
} from '@bitaccess/coinlib-common'
import { extendCodec, enumCodec, requiredOptionalCodec, instanceofCodec } from '@bitaccess/ts-common'
import { bitcoinish, AddressType } from '@bitaccess/coinlib-bitcoin'
import { PsbtInput, TransactionInput } from 'bip174/src/lib/interfaces'

export { BitcoinjsKeyPair } from '@bitaccess/coinlib-bitcoin'

export enum BitcoinCashAddressFormat {
  Cash = 'cashaddr',
  BitPay = 'bitpay',
  Legacy = 'legacy',
}

const SinglesigAddressTypeT = t.keyof(
  {
    [AddressType.Legacy]: null,
  },
  'SinglesigAddressType',
)
export type SinglesigAddressType = t.TypeOf<typeof SinglesigAddressTypeT>
export const SinglesigAddressType = SinglesigAddressTypeT as t.Type<SinglesigAddressType>

const MultisigAddressTypeT = t.keyof(
  {
    [AddressType.MultisigLegacy]: null
  },
  'MultisigAddressType',
)
export type MultisigAddressType = t.TypeOf<typeof MultisigAddressTypeT>
export const MultisigAddressType = MultisigAddressTypeT as t.Type<MultisigAddressType>

export const BitcoinCashAddressFormatT = enumCodec<BitcoinCashAddressFormat>(
  BitcoinCashAddressFormat,
  'BitcoinCashAddressFormat',
)

export interface PsbtInputData extends PsbtInput, TransactionInput {}

export const BitcoinCashBaseConfig = extendCodec(
  BaseConfig,
  {},
  {
    server: bitcoinish.BlockbookConfigServer,
    api: instanceofCodec(bitcoinish.BlockbookServerAPI),
  },
  'BitcoinCashBaseConfig',
)
export type BitcoinCashBaseConfig = t.TypeOf<typeof BitcoinCashBaseConfig>

export const BitcoinCashBalanceMonitorConfig = BitcoinCashBaseConfig
export type BitcoinCashBalanceMonitorConfig = BitcoinCashBaseConfig

export const BitcoinCashPaymentsUtilsConfig = extendCodec(
  BitcoinCashBaseConfig,
  {},
  {
    // The only format to consider valid. Any addresses returned will be converted to this format. Any addresses
    // provided will be rejected if not in this format.
    validAddressFormat: BitcoinCashAddressFormatT,
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
  'KeyPairBitcoinCashPaymentsConfig',
)
export type KeyPairBitcoinCashPaymentsConfig = t.TypeOf<typeof KeyPairBitcoinCashPaymentsConfig>

export const SinglesigBitcoinCashPaymentsConfig = t.union(
  [HdBitcoinCashPaymentsConfig, KeyPairBitcoinCashPaymentsConfig],
  'SinglesigBitcoinCashPaymentsConfig',
)
export type SinglesigBitcoinCashPaymentsConfig = t.TypeOf<typeof SinglesigBitcoinCashPaymentsConfig>

export const MultisigBitcoinCashPaymentsConfig = extendCodec(
  BaseBitcoinCashPaymentsConfig,
  {
    m: t.number,
    signers: t.array(SinglesigBitcoinCashPaymentsConfig),
  },
  {
    addressType: MultisigAddressType,
  },
  'MultisigBitcoinCashPaymentsConfig',
)
export type MultisigBitcoinCashPaymentsConfig = t.TypeOf<typeof MultisigBitcoinCashPaymentsConfig>

export const BitcoinCashPaymentsConfig = t.union(
  [HdBitcoinCashPaymentsConfig, KeyPairBitcoinCashPaymentsConfig, MultisigBitcoinCashPaymentsConfig],
  'BitcoinCashPaymentsConfig',
)
export type BitcoinCashPaymentsConfig = t.TypeOf<typeof BitcoinCashPaymentsConfig>

export const BitcoinCashUnsignedTransactionData = bitcoinish.BitcoinishPaymentTx
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
    changeOutputs: t.array(bitcoinish.BitcoinishTxOutput),
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

export const BitcoinCashBlock = bitcoinish.BlockInfoBitcoin
export type BitcoinCashBlock = bitcoinish.BlockInfoBitcoin
