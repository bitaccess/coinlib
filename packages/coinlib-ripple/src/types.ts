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
import { FormattedTransactionType as RippleTransaction, RippleAPI } from 'ripple-lib'
import { KeyPair } from 'ripple-lib/dist/npm/transaction/types'
import { AccountRipplePayments } from './AccountRipplePayments'

type PromiseValue<T> = T extends Promise<infer X> ? X : never
type RippleLedger = PromiseValue<ReturnType<RippleAPI['getLedger']>>

export { RippleTransaction, RippleLedger, CreateTransactionOptions }

export type TransactionInfoRaw = RippleTransaction & {
  currentLedger: RippleLedger
}

export class RippleServerAPI extends RippleAPI {}

export const BaseRippleConfig = extendCodec(
  BaseConfig,
  {},
  {
    server: nullable(t.string),
    api: instanceofCodec(RippleServerAPI),
  },
  'BaseRippleConfig',
)
export type BaseRippleConfig = t.TypeOf<typeof BaseRippleConfig>

export const RippleBalanceMonitorConfig = BaseRippleConfig
export type RippleBalanceMonitorConfig = t.TypeOf<typeof RippleBalanceMonitorConfig>

export const BaseRipplePaymentsConfig = extendCodec(
  BaseRippleConfig,
  {},
  {
    maxLedgerVersionOffset: t.number, // number of ledgers until a tx expires
  },
  'BaseRipplePaymentsConfig',
)
export type BaseRipplePaymentsConfig = t.TypeOf<typeof BaseRipplePaymentsConfig>

export const HdRipplePaymentsConfig = extendCodec(
  BaseRipplePaymentsConfig,
  {
    hdKey: t.string, // xprv or xpub
  },
  'HdRipplePaymentsConfig',
)
export type HdRipplePaymentsConfig = t.TypeOf<typeof HdRipplePaymentsConfig>

export const SeedRipplePaymentsConfig = extendCodec(
  BaseRipplePaymentsConfig,
  {
    seed: t.string,
  },
  'SeedRipplePaymentsConfig',
)
export type SeedRipplePaymentsConfig = t.TypeOf<typeof SeedRipplePaymentsConfig>

export const UniPubKeyRipplePaymentsConfig = extendCodec(
  BaseRipplePaymentsConfig,
  {
    uniPubKey: t.string,
  },
  'UniPubKeyRipplePaymentsConfig',
)
export type UniPubKeyRipplePaymentsConfig = t.TypeOf<typeof UniPubKeyRipplePaymentsConfig>

export const UHdRipplePaymentsConfig = t.union(
  [SeedRipplePaymentsConfig, UniPubKeyRipplePaymentsConfig],
  'UHdRipplePaymentsConfig',
)
export type UHdRipplePaymentsConfig = t.TypeOf<typeof UHdRipplePaymentsConfig>

export const RippleKeyPair = t.type(
  {
    publicKey: t.string,
    privateKey: t.string,
  },
  'RippleKeyPair',
)
export type RippleKeyPair = t.TypeOf<typeof RippleKeyPair>

export const RippleSecretPair = t.type(
  {
    address: t.string,
    secret: t.string,
  },
  'RippleSecretPair',
)
export type RippleSecretPair = t.TypeOf<typeof RippleSecretPair>

/**
 * address, or secret+address, or public+private key
 */
export const RippleAccountConfig = t.union([t.string, RippleSecretPair, RippleKeyPair], 'RippleAccountConfig')
export type RippleAccountConfig = t.TypeOf<typeof RippleAccountConfig>

export const AccountRipplePaymentsConfig = extendCodec(
  BaseRipplePaymentsConfig,
  {
    hotAccount: RippleAccountConfig,
    depositAccount: RippleAccountConfig,
  },
  'AccountRipplePaymentsConfig',
)
export type AccountRipplePaymentsConfig = t.TypeOf<typeof AccountRipplePaymentsConfig>

export const RipplePaymentsConfig = t.union(
  [HdRipplePaymentsConfig, UHdRipplePaymentsConfig, AccountRipplePaymentsConfig],
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

export const RippleTransactionInfo = extendCodec(
  BaseTransactionInfo,
  {
    confirmationNumber: nullable(t.string),
  },
  {},
  'RippleTransactionInfo',
)
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

export const RippleCreateTransactionOptions = extendCodec(
  CreateTransactionOptions,
  {},
  {
    maxLedgerVersionOffset: t.number,
  },
  'RippleCreateTransactionOptions',
)
export type RippleCreateTransactionOptions = t.TypeOf<typeof RippleCreateTransactionOptions>

export type FromToWithPayport = FromTo & {
  fromPayport: Payport
  toPayport: Payport
}

export type RippleSignatory = {
  address: string
  secret: string | KeyPair
}
