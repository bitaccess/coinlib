import * as t from 'io-ts'
import { extendCodec, Logger, instanceofCodec, nullable, Numeric } from '@faast/ts-common'
import {
  BaseTransactionInfo,
  BaseUnsignedTransaction,
  BaseSignedTransaction,
  BaseBroadcastResult,
  CreateTransactionOptions,
  BaseConfig,
  Payport,
  FromTo,
} from '@faast/payments-common'
import * as Stellar from 'stellar-sdk'

export type StellarCollectionPage<T extends Stellar.Horizon.BaseResponse<never>> = Stellar.ServerApi.CollectionPage<T>
export type StellarRawTransaction = Stellar.ServerApi.TransactionRecord
export type StellarRawLedger = Stellar.ServerApi.LedgerRecord

export { StellarRawTransaction as StellarTransaction, StellarRawLedger as StellarLedger, CreateTransactionOptions }

export type TransactionInfoRaw = StellarRawTransaction & {
  currentLedger: StellarRawLedger
}

export const BaseStellarConfig = extendCodec(
  BaseConfig,
  {},
  {
    server: t.union([t.string, instanceofCodec(Stellar.Server), t.nullType]),
  },
  'BaseStellarConfig',
)
export type BaseStellarConfig = t.TypeOf<typeof BaseStellarConfig>

export const StellarBalanceMonitorConfig = BaseStellarConfig
export type StellarBalanceMonitorConfig = t.TypeOf<typeof StellarBalanceMonitorConfig>

export const BaseStellarPaymentsConfig = extendCodec(
  BaseStellarConfig,
  {},
  {
    txTimeoutSeconds: t.number, // number of seconds until a tx expires
  },
  'BaseStellarPaymentsConfig',
)
export type BaseStellarPaymentsConfig = t.TypeOf<typeof BaseStellarPaymentsConfig>

export const HdStellarPaymentsConfig = extendCodec(
  BaseStellarPaymentsConfig,
  {
    seed: t.string,
  },
  'HdStellarPaymentsConfig',
)
export type HdStellarPaymentsConfig = t.TypeOf<typeof HdStellarPaymentsConfig>

export const StellarSignatory = t.type(
  {
    address: t.string,
    secret: t.string,
  },
  'StellarSignatory',
)
export type StellarSignatory = t.TypeOf<typeof StellarSignatory>

export const PartialStellarSignatory = t.partial(StellarSignatory.props, 'PartialStellarSignatory')
export type PartialStellarSignatory = t.TypeOf<typeof PartialStellarSignatory>

/**
 * address, or secret+address
 */
export const StellarAccountConfig = t.union([
  t.string, PartialStellarSignatory,
], 'StellarAccountConfig')
export type StellarAccountConfig = t.TypeOf<typeof StellarAccountConfig>

export const AccountStellarPaymentsConfig = extendCodec(
  BaseStellarPaymentsConfig,
  {
    hotAccount: StellarAccountConfig,
    depositAccount: StellarAccountConfig,
  },
  'AccountStellarPaymentsConfig',
)
export type AccountStellarPaymentsConfig = t.TypeOf<typeof AccountStellarPaymentsConfig>

export const StellarPaymentsConfig = t.union(
  [HdStellarPaymentsConfig, AccountStellarPaymentsConfig],
  'StellarPaymentsConfig',
)
export type StellarPaymentsConfig = t.TypeOf<typeof StellarPaymentsConfig>

export const StellarUnsignedTransaction = extendCodec(
  BaseUnsignedTransaction,
  {
    amount: t.string,
    fee: t.string,
  },
  'StellarUnsignedTransaction',
)
export type StellarUnsignedTransaction = t.TypeOf<typeof StellarUnsignedTransaction>

export const StellarSignedTransaction = extendCodec(
  BaseSignedTransaction,
  {
    id: t.string,
  },
  'StellarSignedTransaction',
)
export type StellarSignedTransaction = t.TypeOf<typeof StellarSignedTransaction>

export const StellarTransactionInfo = extendCodec(
  BaseTransactionInfo,
  {
    confirmationNumber: nullable(t.number),
  },
  {},
  'StellarTransactionInfo',
)
export type StellarTransactionInfo = t.TypeOf<typeof StellarTransactionInfo>

export const StellarBroadcastResult = extendCodec(
  BaseBroadcastResult,
  {
    rebroadcast: t.boolean,
    data: t.object,
  },
  'StellarBroadcastResult',
)
export type StellarBroadcastResult = t.TypeOf<typeof StellarBroadcastResult>

export const StellarCreateTransactionOptions = extendCodec(
  CreateTransactionOptions,
  {},
  {
    timeoutSeconds: t.number,
  },
  'StellarCreateTransactionOptions',
)
export type StellarCreateTransactionOptions = t.TypeOf<typeof StellarCreateTransactionOptions>

export type FromToWithPayport = FromTo & {
  fromPayport: Payport
  toPayport: Payport
}
