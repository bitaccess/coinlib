import * as t from 'io-ts'
import { extendCodec } from '@faast/ts-common'
import {
  BaseTransactionInfo,
  BaseUnsignedTransaction,
  BaseSignedTransaction,
  BaseBroadcastResult,
  CreateTransactionOptions,
  BaseConfig,
} from '@faast/payments-common'
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
  {
    // optional
    maxAddressScan: t.number, // max address scan to find address index in getAddressIndex
  },
  'HdTronPaymentsConfig',
)
export type HdTronPaymentsConfig = t.TypeOf<typeof HdTronPaymentsConfig>

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

export const TronPaymentsConfig = t.union([HdTronPaymentsConfig, KeyPairTronPaymentsConfig], 'TronPaymentsConfig')
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

export const GetAddressOptions = t.partial({
  cacheIndex: t.boolean,
})
export type GetAddressOptions = t.TypeOf<typeof GetAddressOptions>
