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
import { FormattedTransactionType as StellarTransaction, StellarAPI } from 'stellar-sdk'
import { KeyPair } from 'stellar-sdk/dist/npm/transaction/types'
import { AccountStellarPayments } from './AccountStellarPayments'

type PromiseValue<T> = T extends Promise<infer X> ? X : never
type StellarLedger = PromiseValue<ReturnType<StellarAPI['getLedger']>>

export { StellarTransaction, StellarLedger, CreateTransactionOptions }

export type TransactionInfoRaw = StellarTransaction & {
  currentLedger: StellarLedger
}

export const BaseStellarConfig = extendCodec(
  BaseConfig,
  {},
  {
    server: t.union([t.string, instanceofCodec(StellarAPI), t.nullType]),
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
    maxLedgerVersionOffset: t.number, // number of ledgers until a tx expires
  },
  'BaseStellarPaymentsConfig',
)
export type BaseStellarPaymentsConfig = t.TypeOf<typeof BaseStellarPaymentsConfig>

export const HdStellarPaymentsConfig = extendCodec(
  BaseStellarPaymentsConfig,
  {
    hdKey: t.string, // xprv or xpub
  },
  'HdStellarPaymentsConfig',
)
export type HdStellarPaymentsConfig = t.TypeOf<typeof HdStellarPaymentsConfig>

export const StellarKeyPair = t.type(
  {
    publicKey: t.string,
    privateKey: t.string,
  },
  'StellarKeyPair',
)
export type StellarKeyPair = t.TypeOf<typeof StellarKeyPair>

export const StellarSecretPair = t.type(
  {
    address: t.string,
    secret: t.string,
  },
  'StellarSecretPair',
)
export type StellarSecretPair = t.TypeOf<typeof StellarSecretPair>

/**
 * address, or secret+address, or public+private key
 */
export const StellarAccountConfig = t.union([t.string, StellarSecretPair, StellarKeyPair], 'StellarAccountConfig')
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
    maxLedgerVersionOffset: t.number,
  },
  'StellarCreateTransactionOptions',
)
export type StellarCreateTransactionOptions = t.TypeOf<typeof StellarCreateTransactionOptions>

export type FromToWithPayport = FromTo & {
  fromPayport: Payport
  toPayport: Payport
}

export type StellarSignatory = {
  address: string
  secret: string | KeyPair
}
