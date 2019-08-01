import * as t from 'io-ts'
import { requiredOptionalCodec, extendCodec, enumCodec, nullable, DateT, Logger, functionT } from '@faast/ts-common'

export enum NetworkType {
  Mainnet = 'mainnet',
  Testnet = 'testnet',
}
export const NetworkTypeT = enumCodec<NetworkType>(NetworkType, 'NetworkType')

export const BaseConfig = t.partial(
  {
    network: NetworkTypeT,
    logger: Logger,
  },
  'BaseConfig',
)
export type BaseConfig = t.TypeOf<typeof BaseConfig>

export const AddressOrIndex = t.union([t.string, t.number], 'AddressOrIndex')
export type AddressOrIndex = t.TypeOf<typeof AddressOrIndex>

export enum FeeLevel {
  Custom = 'custom',
  Low = 'low',
  Medium = 'medium',
  High = 'high',
}
export const FeeLevelT = enumCodec<FeeLevel>(FeeLevel, 'FeeLevel')

export enum FeeRateType {
  Main = 'main', // ie bitcoins, ethers
  Base = 'base', // ie satoshis, wei
  BasePerWeight = 'base/weight', // ie satoshis per byte, gas price (wei per gas)
}
export const FeeRateTypeT = enumCodec<FeeRateType>(FeeRateType, 'FeeRateType')

export const FeeOptionCustom = requiredOptionalCodec(
  {
    feeRate: t.string,
    feeRateType: FeeRateTypeT,
  },
  {
    feeLevel: t.literal(FeeLevel.Custom),
  },
  'FeeOptionCustom',
)

export const FeeOptionLevel = t.type(
  {
    feeLevel: t.union([t.literal(FeeLevel.High), t.literal(FeeLevel.Medium), t.literal(FeeLevel.Low)]),
  },
  'FeeOptionLevel',
)

export const FeeOption = t.union([FeeOptionCustom, FeeOptionLevel], 'FeeOption')
export type FeeOption = t.TypeOf<typeof FeeOption>

export const CreateTransactionOptions = FeeOption
export type CreateTransactionOptions = t.TypeOf<typeof CreateTransactionOptions>

export const ResolvedFeeOption = t.type({
  targetFeeLevel: FeeLevelT,
  targetFeeRate: t.string,
  targetFeeRateType: FeeRateTypeT,
  feeBase: t.string,
  feeMain: t.string,
})
export type ResolvedFeeOption = t.TypeOf<typeof ResolvedFeeOption>

export const BalanceResult = t.type(
  {
    confirmedBalance: t.string, // balance with at least 1 confirmation
    unconfirmedBalance: t.string, // balance that is pending confirmation
    sweepable: t.boolean, // balance is high enough to be swept
  },
  'BalanceResult',
)
export type BalanceResult = t.TypeOf<typeof BalanceResult>

export enum TransactionStatus {
  Unsigned = 'unsigned',
  Signed = 'signed',
  Pending = 'pending',
  Confirmed = 'confirmed',
  Failed = 'failed',
}
export const TransactionStatusT = enumCodec<TransactionStatus>(TransactionStatus, 'TransactionStatus')

export const TransactionCommon = requiredOptionalCodec(
  {
    id: nullable(t.string), // network txid
    fromAddress: nullable(t.string), // sender address
    toAddress: nullable(t.string), // recipient address
    fromIndex: nullable(t.number), // sender address index
    toIndex: nullable(t.number), // recipient address index, null if not ours
    amount: nullable(t.string), // main denomination (eg "0.125")
    fee: nullable(t.string), // total fee in main denomination
    status: TransactionStatusT,
  },
  {
    fromExtraId: nullable(t.string), // eg ripple sender tag
    toExtraId: nullable(t.string), // eg Monero payment ID or ripple destination tag
  },
  'TransactionCommon',
)
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
type UnsignedCommon = t.TypeOf<typeof UnsignedCommon>

export type FromTo = Pick<
  BaseUnsignedTransaction,
  'fromAddress' | 'fromIndex' | 'fromExtraId' | 'toAddress' | 'toIndex' | 'toExtraId'
>

export const BaseUnsignedTransaction = extendCodec(
  UnsignedCommon,
  {
    status: t.literal('unsigned'),
    data: t.object,
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
    data: t.object,
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
    confirmationId: nullable(t.string), // eg block number or hash. null if not confirmed
    confirmationTimestamp: nullable(DateT), // block timestamp. null if timestamp unavailable or unconfirmed
    data: t.object,
  },
  'BaseTransactionInfo',
)
export type BaseTransactionInfo = t.TypeOf<typeof BaseTransactionInfo>

export const BaseBroadcastResult = t.type(
  {
    id: t.string,
  },
  'BaseBroadcastResult',
)
export type BaseBroadcastResult = t.TypeOf<typeof BaseBroadcastResult>

export const Payport = requiredOptionalCodec(
  {
    address: t.string,
  },
  {
    extraId: nullable(t.string),
  },
  'Payport',
)
export type Payport = t.TypeOf<typeof Payport>

export const BalanceActivityType = t.union([t.literal('in'), t.literal('out')], 'BalanceActivityType')
export type BalanceActivityType = t.TypeOf<typeof BalanceActivityType>

export const BalanceActivity = t.type(
  {
    type: BalanceActivityType,
    networkType: NetworkTypeT,
    networkSymbol: t.string,
    assetSymbol: t.string,
    address: t.string,
    extraId: nullable(t.string),
    amount: t.string,
    externalId: t.string,
    activitySequence: t.string,
    confirmationId: t.string,
    confirmationNumber: t.number,
    timestamp: DateT,
  },
  'BalanceActivity',
)
export type BalanceActivity = t.TypeOf<typeof BalanceActivity>

export const BalanceMonitorConfig = requiredOptionalCodec(
  {
    network: NetworkTypeT,
  },
  {
    logger: Logger,
  },
  'BalanceMonitorConfig',
)
export type BalanceMonitorConfig = t.TypeOf<typeof BalanceMonitorConfig>

export const GetBalanceActivityOptions = t.partial(
  {
    from: BalanceActivity,
    to: BalanceActivity,
  },
  'GetBalanceActivityOptions',
)
export type GetBalanceActivityOptions = t.TypeOf<typeof GetBalanceActivityOptions>

export type BalanceActivityCallback = (ba: BalanceActivity) => Promise<void> | void
export const BalanceActivityCallback = functionT<BalanceActivityCallback>('BalanceActivityCallback')
