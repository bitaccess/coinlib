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
