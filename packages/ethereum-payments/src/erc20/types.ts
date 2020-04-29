import * as t from 'io-ts'
import {
  extendCodec,
  Logger,
  nullable,
  Numeric
} from '@faast/ts-common'
import {
  BaseTransactionInfo,
  BaseUnsignedTransaction,
  BaseSignedTransaction,
  BaseBroadcastResult,
  BaseConfig,
  Payport,
  FromTo,
  ResolveablePayport,
  ResolvedFeeOption,
} from '@faast/payments-common'

const keys = t.type({
    pub: t.string,
    prv: t.string,
})

const xkeys = t.type({
  xprv: t.string,
  xpub: t.string,
})

const NullableOptionalString = t.union([t.string, t.null, t.undefined])
const OptionalString = t.union([t.string, t.undefined])

export const BaseErc20PaymentsConfig = extendCodec(
  BaseConfig,
  {},
  {
    fullNode:   OptionalString,
    parityNode: OptionalString,
    gasStation: OptionalString,
  },
  'BaseErc20PaymentsConfig',
)
export type BaseErc20PaymentsConfig = t.TypeOf<typeof BaseErc20PaymentsConfig>

export const HdErc20PaymentsConfig = extendCodec(
  BaseErc20PaymentsConfig,
  {
    hdKey: t.string,
  },
  'HdErc20PaymentsConfig',
)
export type HdErc20PaymentsConfig = t.TypeOf<typeof HdErc20PaymentsConfig>


export const KeyPairErc20PaymentsConfig = extendCodec(
  BaseErc20PaymentsConfig,
  {
    // can be private keys or addresses
    keyPairs: t.union([t.array(NullableOptionalString), t.record(t.number, NullableOptionalString)]),
  },
  'KeyPairErc20PaymentsConfig',
)
export type KeyPairErc20PaymentsConfig = t.TypeOf<typeof KeyPairErc20PaymentsConfig>

export const Erc20PaymentsConfig = t.union([HdErc20PaymentsConfig, KeyPairErc20PaymentsConfig], 'Erc20PaymentsConfig')
export type Erc20PaymentsConfig = t.TypeOf<typeof Erc20PaymentsConfig>

export const Erc20UnsignedTransaction = extendCodec(
  BaseUnsignedTransaction,
  {
    id: t.string,
    amount: t.string,
    fee: t.string,
  },
  'Erc20UnsignedTransaction',
)
export type Erc20UnsignedTransaction = t.TypeOf<typeof Erc20UnsignedTransaction>

export const Erc20SignedTransaction = extendCodec(
  BaseSignedTransaction,
  {
    data: t.type({
      hex: t.string
    }),
  },
  {},
  'Erc20SignedTransaction'
)
export type Erc20SignedTransaction = t.TypeOf<typeof Erc20SignedTransaction>

export const Erc20TransactionInfo = extendCodec(
  BaseTransactionInfo,
  {},
  {},
  'Erc20TransactionInfo')
export type Erc20TransactionInfo = t.TypeOf<typeof Erc20TransactionInfo>

export const Erc20BroadcastResult = extendCodec(
  BaseBroadcastResult,
  {},
  'Erc20BroadcastResult',
)
export type Erc20BroadcastResult = t.TypeOf<typeof Erc20BroadcastResult>

export const Erc20ResolvedFeeOption = extendCodec(
  ResolvedFeeOption,
  {
    gasPrice: t.string,
  },
  'Erc20ResolvedFeeOption'
)
export type Erc20ResolvedFeeOption = t.TypeOf<typeof Erc20ResolvedFeeOption>
