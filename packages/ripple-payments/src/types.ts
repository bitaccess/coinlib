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
  BalanceMonitorConfig,
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
    maxLedgerVersionOffset: t.number, // number of ledgers until a tx expires
  },
  'RipplePaymentsConfig',
)
export type RipplePaymentsConfig = t.TypeOf<typeof RipplePaymentsConfig>

export const RippleUnsignedTransaction = extendCodec(
  BaseUnsignedTransaction,
  {
    amount: t.string,
    fee: t.string,
  },
  'RippleUnsignedTransaction',
)
export type RippleUnsignedTransaction = t.TypeOf<typeof RippleUnsignedTransaction>

export const RippleSignedTransaction = extendCodec(
  BaseSignedTransaction,
  {
    id: t.string,
  },
  'RippleSignedTransaction',
)
export type RippleSignedTransaction = t.TypeOf<typeof RippleSignedTransaction>

export const RippleTransactionInfo = extendCodec(BaseTransactionInfo, {}, {}, 'RippleTransactionInfo')
export type RippleTransactionInfo = t.TypeOf<typeof RippleTransactionInfo>

export const RippleBroadcastResult = extendCodec(
  BaseBroadcastResult,
  {
    rebroadcast: t.boolean,
    data: t.object,
  },
  'RippleBroadcastResult',
)
export type RippleBroadcastResult = t.TypeOf<typeof RippleBroadcastResult>

export const RippleBalanceMonitorConfig = extendCodec(
  BalanceMonitorConfig,
  {
    server: t.union([t.string, instanceofCodec(RippleAPI)]),
  },
  'RippleBalanceMonitorConfig',
)
export type RippleBalanceMonitorConfig = t.TypeOf<typeof RippleBalanceMonitorConfig>

export const RippleCreateTransactionOptions = extendCodec(
  CreateTransactionOptions,
  {},
  {
    maxLedgerVersionOffset: t.number,
    sequence: t.number,
  },
  'RippleCreateTransactionOptions',
)
export type RippleCreateTransactionOptions = t.TypeOf<typeof RippleCreateTransactionOptions>
