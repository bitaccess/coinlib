import * as t from 'io-ts'

import { DateT } from './DateT'
import { enumCodec, extendCodec, requiredOptionalCodec, nullable } from './helpers'

export * from './DateT'
export * from './helpers'

export const AddressOrIndex = t.union([t.string, t.number], 'AddressOrIndex')
export type AddressOrIndex = t.TypeOf<typeof AddressOrIndex>

export enum FeeLevel {
  Custom = 'custom',
  Low = 'low',
  Medium = 'medium',
  High = 'high'
}
export const FeeLevelT = enumCodec<FeeLevel>(FeeLevel, 'FeeLevel')

export enum FeeRateType {
  Main = 'main', // ie bitcoins, ethers
  Base = 'base', // ie satoshis, wei
  BasePerWeight = 'base/weight' // ie satoshis per byte, gas price (wei per gas)
}
export const FeeRateTypeT = enumCodec<FeeRateType>(FeeRateType, 'FeeRateType')

export const FeeOption = t.union([
  requiredOptionalCodec(
    {
      feeRate: t.string,
      feeRateType: FeeRateTypeT,
    },
    {
      feeLevel: t.literal(FeeLevel.Custom),
    },
    'FeeOptionCustom'
  ),
  t.type({
    feeLevel: t.union([
      t.literal(FeeLevel.High),
      t.literal(FeeLevel.Medium),
      t.literal(FeeLevel.Low),
    ])
  }, 'FeeOptionLevel'),
], 'FeeOption')
export type FeeOption = t.TypeOf<typeof FeeOption>

export const CreateTransactionOptions = FeeOption
export type CreateTransactionOptions = t.TypeOf<typeof CreateTransactionOptions>

export const BalanceResult = t.type({
  balance: t.string, // balance with at least 1 confirmation
  unconfirmedBalance: t.string, // balance that is pending confirmation on the blockchain
}, 'BalanceResult')
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
  id: nullable(t.string), // network txid
  fromAddress: nullable(t.string), // sender address
  toAddress: nullable(t.string), // recipient address
  toExtraId: nullable(t.string), // eg Monero payment ID
  fromIndex: nullable(t.number), // sender address index
  toIndex: nullable(t.number), // recipient address index, null if not ours
  amount: nullable(t.string), // main denomination (eg "0.125")
  fee: nullable(t.string), // total fee in main denomination
  status: TransactionStatusT,
}, 'TransactionCommon')
export type TransactionCommon = t.TypeOf<typeof TransactionCommon>

const UnsignedCommon = extendCodec(
  TransactionCommon,
  {
    fromAddress: t.string,
    toAddress: t.string,
    fromIndex: t.number,
    targetFeeLevel: FeeLevelT,
    targetFeeRate: nullable(t.string),
    targetFeeRateType: nullable(FeeRateTypeT),
  },
  'UnsignedCommon',
)

export const BaseUnsignedTransaction = extendCodec(
  UnsignedCommon,
  {
    status: t.literal('unsigned'),
    data: t.UnknownRecord,
  },
  'BaseUnsignedTransaction',
)
export type BaseUnsignedTransaction = t.TypeOf<typeof BaseUnsignedTransaction>

export const BaseSignedTransaction = extendCodec(
  UnsignedCommon,
  {
    status: t.literal('signed'),
    id: t.string,
    amount: t.string,
    fee: t.string,
    data: t.UnknownRecord,
  },
  'BaseSignedTransaction',
)
export type BaseSignedTransaction = t.TypeOf<typeof BaseSignedTransaction>

export const BaseTransactionInfo = extendCodec(
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
    data: t.UnknownRecord,
  },
  'BaseTransactionInfo',
)
export type BaseTransactionInfo = t.TypeOf<typeof BaseTransactionInfo>

export const BaseBroadcastResult = t.type({
  id: t.string,
}, 'BaseBroadcastResult')
export type BaseBroadcastResult = t.TypeOf<typeof BaseBroadcastResult>
