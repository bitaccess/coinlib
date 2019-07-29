import * as t from 'io-ts'
import {
  extendCodec,
  Logger,
  requiredOptionalCodec,
  instanceofCodec,
  nullable,
  DateT,
  functionT,
} from '@faast/ts-common'
import {
  BaseTransactionInfo,
  BaseUnsignedTransaction,
  BaseSignedTransaction,
  BaseBroadcastResult,
  CreateTransactionOptions,
  BaseConfig,
  NetworkType,
  NetworkTypeT,
} from '@faast/payments-common'
import { FormattedTransactionType as RippleTransaction, RippleAPI } from 'ripple-lib'

type PromiseValue<T> = T extends Promise<infer X> ? X : never
type RippleLedger = PromiseValue<ReturnType<RippleAPI['getLedger']>>

export { RippleTransaction, RippleLedger, CreateTransactionOptions }

export type TransactionInfoRaw = RippleTransaction & {
  currentLedger: RippleLedger
}

export const RipplePaymentsConfig = extendCodec(
  BaseConfig,
  {
    hdKey: t.string, // xprv or xpub
  },
  {
    server: t.string,
    logger: Logger,
  },
  'RipplePaymentsConfig',
)
export type RipplePaymentsConfig = t.TypeOf<typeof RipplePaymentsConfig>

export const RippleUnsignedTransaction = extendCodec(
  BaseUnsignedTransaction,
  {
    id: t.string,
    amount: t.string,
    fee: t.string,
  },
  'RippleUnsignedTransaction',
)
export type RippleUnsignedTransaction = t.TypeOf<typeof RippleUnsignedTransaction>

export const RippleSignedTransaction = extendCodec(BaseSignedTransaction, {}, {}, 'RippleSignedTransaction')
export type RippleSignedTransaction = t.TypeOf<typeof RippleSignedTransaction>

export const RippleTransactionInfo = extendCodec(BaseTransactionInfo, {}, {}, 'RippleTransactionInfo')
export type RippleTransactionInfo = t.TypeOf<typeof RippleTransactionInfo>

export const RippleBroadcastResult = extendCodec(
  BaseBroadcastResult,
  {
    rebroadcast: t.boolean,
  },
  'RippleBroadcastResult',
)
export type RippleBroadcastResult = t.TypeOf<typeof RippleBroadcastResult>

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

export const RippleBalanceMonitorConfig = requiredOptionalCodec(
  {
    network: NetworkTypeT,
  },
  {
    server: t.union([t.string, instanceofCodec(RippleAPI)]),
    logger: Logger,
  },
  'RippleBalanceMonitorConfig',
)
export type RippleBalanceMonitorConfig = t.TypeOf<typeof RippleBalanceMonitorConfig>

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
