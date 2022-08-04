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
} from '@bitaccess/coinlib-common'
import * as Stellar from 'stellar-sdk'

type NonFunctionPropertyNames<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T]
type NonFunctionProperties<T> = Pick<T, NonFunctionPropertyNames<T>>

export type StellarCollectionPage<T extends Stellar.Horizon.BaseResponse<never>> = Stellar.ServerApi.CollectionPage<T>
export type StellarRawTransaction = NonFunctionProperties<Stellar.ServerApi.TransactionRecord>
export type StellarRawLedger = NonFunctionProperties<Stellar.ServerApi.LedgerRecord>

export { StellarRawTransaction as StellarTransaction, StellarRawLedger as StellarLedger, CreateTransactionOptions }

export class StellarServerAPI extends Stellar.Server {}

export type TransactionInfoRaw = StellarRawTransaction & {
  currentLedger: StellarRawLedger
}

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

export const BaseStellarConfig = extendCodec(
  BaseConfig,
  {},
  {
    server: nullable(t.string),
    api: instanceofCodec(StellarServerAPI),
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

/**
 * address, or secret+address
 */
 export const StellarAccountConfig = t.union([t.string, PartialStellarSignatory], 'StellarAccountConfig')
 export type StellarAccountConfig = t.TypeOf<typeof StellarAccountConfig>

export const HdStellarPaymentsConfig = extendCodec(
  BaseStellarPaymentsConfig,
  {
    seed: t.string,
  },
  {
    derivationPath: t.string,
    hotAccount: StellarAccountConfig,
    depositAccount: StellarAccountConfig,
  },
  'HdStellarPaymentsConfig',
)
export type HdStellarPaymentsConfig = t.TypeOf<typeof HdStellarPaymentsConfig>


export const SeedStellarPaymentsConfig = extendCodec(
  BaseStellarPaymentsConfig,
  {
    seed: t.string,
  },
  {
    derivationPath: t.string,
  },
  'SeedStellarPaymentsConfig',
)
export type SeedStellarPaymentsConfig = t.TypeOf<typeof SeedStellarPaymentsConfig>

export const UniPubKeyStellarPaymentsConfig = extendCodec(
  BaseStellarPaymentsConfig,
  {
    uniPubKey: t.string,
  },
  {
    derivationPath: t.string,
  },
  'UniPubKeyStellarPaymentsConfig',
)
export type UniPubKeyStellarPaymentsConfig = t.TypeOf<typeof UniPubKeyStellarPaymentsConfig>

export const UHdStellarPaymentsConfig = t.union(
  [SeedStellarPaymentsConfig, UniPubKeyStellarPaymentsConfig],
  'UHdStellarPaymentsConfig',
)
export type UHdStellarPaymentsConfig = t.TypeOf<typeof UHdStellarPaymentsConfig>



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
  [HdStellarPaymentsConfig, UHdStellarPaymentsConfig, AccountStellarPaymentsConfig],
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

export const StellarSignedTransaction = extendCodec(BaseSignedTransaction, {}, 'StellarSignedTransaction')
export type StellarSignedTransaction = t.TypeOf<typeof StellarSignedTransaction>

export const StellarTransactionInfo = extendCodec(
  BaseTransactionInfo,
  {
    confirmationNumber: nullable(t.string),
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
