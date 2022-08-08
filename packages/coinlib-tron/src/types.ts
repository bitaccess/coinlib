import * as t from 'io-ts'
import { extendCodec, Logger } from '@bitaccess/ts-common'
import {
  BaseTransactionInfo,
  BaseUnsignedTransaction,
  BaseSignedTransaction,
  BaseBroadcastResult,
  CreateTransactionOptions,
  BaseConfig,
  FromTo,
  Payport,
} from '@bitaccess/coinlib-common'
import {
  Transaction as TronWebTransaction,
  TransactionInfo as TronWebTransactionInfo,
  Block as TronWebBlock,
} from 'tronweb'

export { TronWebTransaction, TronWebTransactionInfo, TronWebBlock, CreateTransactionOptions }

export type TransactionInfoRaw = TronWebTransaction &
  TronWebTransactionInfo & {
    currentBlock: Pick<TronWebBlock, 'blockID' | 'block_header'>
  }

export const BaseTronPaymentsConfig = extendCodec(
  BaseConfig,
  {},
  {
    fullNode: t.string,
    solidityNode: t.string,
    eventServer: t.string,
  },
  'BaseTronPaymentsConfig',
)
export type BaseTronPaymentsConfig = t.TypeOf<typeof BaseTronPaymentsConfig>

export const HdTronPaymentsConfig = extendCodec(
  BaseTronPaymentsConfig,
  {
    // required
    hdKey: t.string, // xprv or xpub
  },
  'HdTronPaymentsConfig',
)
export type HdTronPaymentsConfig = t.TypeOf<typeof HdTronPaymentsConfig>

export const SeedPaymentConfig = extendCodec(
  BaseTronPaymentsConfig,
  {
    seed: t.string,
  },
  {
    derivationPath: t.string,
  },
  'SeedPaymentConfig',
)
export type SeedPaymentConfig = t.TypeOf<typeof SeedPaymentConfig>
export const UniPubKeyPaymentConfig = extendCodec(
  BaseTronPaymentsConfig,
  {
    uniPubKey: t.string,
  },
  {
    derivationPath: t.string,
  },
  'UniPubKeyPaymentConfig',
)
export type UniPubKeyPaymentConfig = t.TypeOf<typeof UniPubKeyPaymentConfig>
export const UHdTronPaymentsConfig = t.union([SeedPaymentConfig, UniPubKeyPaymentConfig], 'UHdTronPaymentsConfig')
export type UHdTronPaymentsConfig = t.TypeOf<typeof UHdTronPaymentsConfig>

const NullableOptionalString = t.union([t.string, t.null, t.undefined])

export const KeyPairTronPaymentsConfig = extendCodec(
  BaseTronPaymentsConfig,
  {
    // can be private keys or addresses
    keyPairs: t.union([t.array(NullableOptionalString), t.record(t.number, NullableOptionalString)]),
  },
  'KeyPairTronPaymentsConfig',
)
export type KeyPairTronPaymentsConfig = t.TypeOf<typeof KeyPairTronPaymentsConfig>

export const TronPaymentsConfig = t.union(
  [HdTronPaymentsConfig, UHdTronPaymentsConfig, KeyPairTronPaymentsConfig],
  'TronPaymentsConfig',
)
export type TronPaymentsConfig = t.TypeOf<typeof TronPaymentsConfig>

export const TronUnsignedTransaction = extendCodec(
  BaseUnsignedTransaction,
  {
    id: t.string,
    amount: t.string,
    fee: t.string,
  },
  'TronUnsignedTransaction',
)
export type TronUnsignedTransaction = t.TypeOf<typeof TronUnsignedTransaction>

export const TronSignedTransaction = extendCodec(BaseSignedTransaction, {}, {}, 'TronSignedTransaction')
export type TronSignedTransaction = t.TypeOf<typeof TronSignedTransaction>

export const TronTransactionInfo = extendCodec(BaseTransactionInfo, {}, {}, 'TronTransactionInfo')
export type TronTransactionInfo = t.TypeOf<typeof TronTransactionInfo>

export const TronBroadcastResult = extendCodec(
  BaseBroadcastResult,
  {
    rebroadcast: t.boolean,
  },
  'TronBroadcastResult',
)
export type TronBroadcastResult = t.TypeOf<typeof TronBroadcastResult>

export type FromToWithPayport = FromTo & {
  fromPayport: Payport
  toPayport: Payport
}
