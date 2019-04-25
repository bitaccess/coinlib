import * as t from 'io-ts'
import { extendCodec } from '@faast/ts-common'
import {
  BaseTransactionInfo, BaseUnsignedTransaction, BaseSignedTransaction, BaseBroadcastResult,
} from 'payments-common'
import {
  Transaction as TronWebTransaction,
  TransactionInfo as TronWebTransactionInfo,
  Block as TronWebBlock
} from 'tronweb'

export { TronWebTransaction, TronWebTransactionInfo, TronWebBlock }

export type TransactionInfoRaw = TronWebTransaction & TronWebTransactionInfo & {
  currentBlock: Pick<TronWebBlock, 'blockID' | 'block_header'>
}

export const BaseTronPaymentsConfig = t.partial({
  fullNode: t.string,
  solidityNode: t.string,
  eventServer: t.string,
}, 'BaseTronPaymentsConfig')
export type BaseTronPaymentsConfig = t.TypeOf<typeof BaseTronPaymentsConfig>

export const HdTronPaymentsConfig = extendCodec(
  BaseTronPaymentsConfig,
  { // required
    hdKey: t.string, // xprv or xpub
  },
  { // optional
    maxAddressScan: t.number, // max address scan to find address index in getAddressIndex
  },
  'HdTronPaymentsConfig',
)
export type HdTronPaymentsConfig = t.TypeOf<typeof HdTronPaymentsConfig>

export const KeyPairTronPaymentsConfig = extendCodec(
  BaseTronPaymentsConfig,
  {
    // can be private keys or addresses
    keyPairs: t.union([
      t.array(t.union([t.string, t.null, t.undefined])),
      t.record(t.number, t.string),
    ]),
  },
  {},
  'KeyPairTronPaymentsConfig',
)
export type KeyPairTronPaymentsConfig = t.TypeOf<typeof KeyPairTronPaymentsConfig>

export const TronPaymentsConfig = t.union([HdTronPaymentsConfig, KeyPairTronPaymentsConfig])
export type TronPaymentsConfig = t.TypeOf<typeof TronPaymentsConfig>

export const TronUnsignedTransaction = extendCodec(
  BaseUnsignedTransaction,
  {
    id: t.string,
    amount: t.string,
    fee: t.string,
  },
  {},
  'TronUnsignedTransaction',
)
export type TronUnsignedTransaction = t.TypeOf<typeof TronUnsignedTransaction>

export const TronSignedTransaction = extendCodec(
  BaseSignedTransaction,
  {},
  {},
  'TronSignedTransaction',
)
export type TronSignedTransaction = t.TypeOf<typeof TronSignedTransaction>

export const TronTransactionInfo = extendCodec(
  BaseTransactionInfo,
  {
    from: t.string,
    to: t.string,
  },
  {},
  'TronTransactionInfo',
)
export type TronTransactionInfo = t.TypeOf<typeof TronTransactionInfo>

export const TronBroadcastResult = extendCodec(
  BaseBroadcastResult,
  {
    rebroadcast: t.boolean,
  },
  {},
  'TronBroadcastResult',
)
export type TronBroadcastResult = t.TypeOf<typeof TronBroadcastResult>

export const CreateTransactionOptions = t.partial({
  fee: t.number, // in sun
})
export type CreateTransactionOptions = t.TypeOf<typeof CreateTransactionOptions>

export const GetAddressOptions = t.partial({
  cacheIndex: t.boolean,
})
export type GetAddressOptions = t.TypeOf<typeof GetAddressOptions>
