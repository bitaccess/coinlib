import * as t from 'io-ts'
import {
  BaseConfig, BaseUnsignedTransaction, BaseSignedTransaction, FeeRate,
  BaseTransactionInfo, BaseBroadcastResult, UtxoInfo, KeyPairsConfigParam,
} from '@faast/payments-common'
import { extendCodec, enumCodec, Numeric, requiredOptionalCodec } from '@faast/ts-common';
import { Network as BitcoinjsNetwork, Signer as BitcoinjsSigner } from 'bitcoinjs-lib';
import { BlockInfoBitcoin } from 'blockbook-client'
import { BitcoinishPaymentTx, BlockbookConfigServer } from './bitcoinish'

export { BitcoinjsNetwork, UtxoInfo }
export * from './bitcoinish/types'

export type BitcoinjsKeyPair = BitcoinjsSigner & {
  privateKey?: Buffer
  toWIF(): string
}

export enum AddressType {
  Legacy = 'p2pkh',
  SegwitP2SH = 'p2sh-p2wpkh',
  SegwitNative = 'p2wpkh',
}
export const AddressTypeT = enumCodec<AddressType>(AddressType, 'AddressType')

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
    addressType: AddressTypeT,
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
  'KeyPairBitcoinPaymentsConfig',
)
export type KeyPairBitcoinPaymentsConfig = t.TypeOf<typeof KeyPairBitcoinPaymentsConfig>

export const MultisigSignerKey = t.union([
  t.type({
    publicKey: t.string,
  }),
  t.type({
    privateKey: t.string,
  })
], 'MultisigSignerKey')
export type MultisigSignerKey = t.TypeOf<typeof MultisigSignerKey>

export const MultisigBitcoinPaymentsConfig = extendCodec(
  BaseBitcoinPaymentsConfig,
  {
    signers: t.array(MultisigSignerKey),
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

export const BitcoinUnsignedTransaction = extendCodec(
  BaseUnsignedTransaction,
  {
    amount: t.string,
    fee: t.string,
    data: BitcoinUnsignedTransactionData,
  },
  'BitcoinUnsignedTransaction',
)
export type BitcoinUnsignedTransaction = t.TypeOf<typeof BitcoinUnsignedTransaction>

export const BitcoinSignedTransaction = extendCodec(BaseSignedTransaction, {
  data: t.type({
    hex: t.string,
  }),
}, {}, 'BitcoinSignedTransaction')
export type BitcoinSignedTransaction = t.TypeOf<typeof BitcoinSignedTransaction>

export const BitcoinTransactionInfo = extendCodec(BaseTransactionInfo, {}, {}, 'BitcoinTransactionInfo')
export type BitcoinTransactionInfo = t.TypeOf<typeof BitcoinTransactionInfo>

export const BitcoinBroadcastResult = extendCodec(BaseBroadcastResult, {}, {}, 'BitcoinBroadcastResult')
export type BitcoinBroadcastResult = t.TypeOf<typeof BitcoinBroadcastResult>

export const BitcoinBlock = BlockInfoBitcoin
export type BitcoinBlock = BlockInfoBitcoin
