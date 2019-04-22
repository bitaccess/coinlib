import * as t from 'io-ts'

import { DateT } from './DateT'
import { enumCodec, extend, nullable } from './helpers'

export * from './DateT'
export * from './helpers'

export const BalanceResult = t.type({
  balance: t.string, // balance with at least 1 confirmation
  unconfirmedBalance: t.string, // balance that is pending confirmation on the blockchain
})
export type BalanceResult = t.TypeOf<typeof BalanceResult>

export enum TransactionStatus {
  Unsigned = 'unsigned',
  Signed = 'signed',
  Pending = 'pending',
  Confirmed = 'confirmed',
  Failed = 'failed',
}
export const TransactionStatusT = enumCodec(TransactionStatus, 'TransactionStatus')

export const TransactionCommon = t.type({
  id: nullable(t.string), // txid
  from: nullable(t.string), // sender address
  to: nullable(t.string), // recipient address
  toExtraId: nullable(t.string), // eg Monero payment ID
  fromIndex: nullable(t.number), // sender address index
  toIndex: nullable(t.number), // recipient address index, null if not ours
  amount: nullable(t.string), // main denomination (eg "0.125")
  fee: nullable(t.string), // total fee in main denomination
  status: TransactionStatusT,
})
export type TransactionCommon = t.TypeOf<typeof TransactionCommon>

const UnsignedCommon = extend(
  TransactionCommon,
  {
    from: t.string,
    to: t.string,
    fromIndex: t.number,
    rawUnsigned: t.UnknownRecord,
  },
  {},
  'UnsignedCommon',
)

export const BaseUnsignedTransaction = extend(
  UnsignedCommon,
  {
    status: t.literal('unsigned'),
  },
  {},
  'BaseUnsignedTransaction',
)
export type BaseUnsignedTransaction = t.TypeOf<typeof BaseUnsignedTransaction>

export const BaseSignedTransaction = extend(
  UnsignedCommon,
  {
    status: t.literal('signed'),
    id: t.string,
    amount: t.string,
    fee: t.string,
    rawSigned: t.UnknownRecord,
  },
  {},
  'BaseSignedTransaction',
)
export type BaseSignedTransaction = t.TypeOf<typeof BaseSignedTransaction>

export const BaseTransactionInfo = extend(
  TransactionCommon,
  {
    id: t.string,
    amount: t.string,
    fee: t.string,
    isExecuted: t.boolean, // true if transaction didn't fail (eg TRX/ETH contract succeeded)
    isConfirmed: t.boolean,
    confirmations: t.number, // 0 if not confirmed
    block: nullable(t.number), // null if not confirmed
    date: nullable(DateT), // null if timestamp unavailable
    rawInfo: t.UnknownRecord,
  },
  {},
  'BaseTransactionInfo',
)
export type BaseTransactionInfo = t.TypeOf<typeof BaseTransactionInfo>

export const BaseBroadcastResult = t.type({
  id: t.string,
}, 'BaseBroadcastResult')
export type BaseBroadcastResult = t.TypeOf<typeof BaseBroadcastResult>
