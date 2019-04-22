import * as t from 'io-ts'
import { date as DateT } from 'io-ts-types'

/**
 * Creates an io-ts runtime type based off a typescript enum `e`
 */
export function enumCodec<E>(e: Object, name: string): t.Type<E> {
  const keyed: { [k: string]: null } = {}
  Object.values(e).forEach(v => {
    keyed[v] = null
  })
  return t.keyof(keyed, name) as any
}

/**
 * Extends a codec with additional required and optional attributes
 *
 * @param parent The type to extend
 * @param required The required props to add
 * @param optional The optional props to add
 * @param name The name of the type
 */
export function extend<P extends t.Mixed, R extends t.Props, O extends t.Props>(
  parent: P, required: R, optional: O, name: string,
) {
  return t.intersection(
    [
      parent,
      t.type(required, `${name}Req`),
      t.partial(optional, `${name}Opt`),
    ],
    name,
  )
}

export const nullable = <T extends t.Mixed>(codec: T) => t.union([codec, t.null], `${codec.name}Nullable`)

export const BalanceResult = t.type({
  balance: t.string, // balance with at least 1 confirmation
  unconfirmedBalance: t.string, // balance that is pending confirmation on the blockchain
})
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
  id: nullable(t.string), // txid
  from: nullable(t.string), // sender address
  to: nullable(t.string), // recipient address
  toExtraId: nullable(t.string), // eg Monero payment ID
  fromIndex: nullable(t.number), // sender address index
  toIndex: nullable(t.number), // recipient address index, null if not ours
  amount: nullable(t.string), // main denomination (eg "0.125")
  fee: nullable(t.string), // total fee in main denomination
  status: TransactionStatusT,
})
export type TransactionCommon = t.TypeOf<typeof TransactionCommon>

const UnsignedCommon = extend(
  TransactionCommon,
  {
    from: t.string,
    to: t.string,
    fromIndex: t.number,
    rawUnsigned: t.UnknownRecord,
  },
  {},
  'UnsignedCommon',
)

export const BaseUnsignedTransaction = extend(
  UnsignedCommon,
  {
    status: t.literal('unsigned'),
  },
  {},
  'BaseUnsignedTransaction',
)
export type BaseUnsignedTransaction = t.TypeOf<typeof BaseUnsignedTransaction>

export const BaseSignedTransaction = extend(
  UnsignedCommon,
  {
    status: t.literal('signed'),
    id: t.string,
    amount: t.string,
    fee: t.string,
    rawSigned: t.UnknownRecord,
  },
  {},
  'BaseSignedTransaction',
)
export type BaseSignedTransaction = t.TypeOf<typeof BaseSignedTransaction>

export const BaseTransactionInfo = extend(
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
    rawInfo: t.UnknownRecord,
  },
  {},
  'BaseTransactionInfo',
)
export type BaseTransactionInfo = t.TypeOf<typeof BaseTransactionInfo>

export const BaseBroadcastResult = t.type({
  id: t.string,
}, 'BaseBroadcastResult')
export type BaseBroadcastResult = t.TypeOf<typeof BaseBroadcastResult>
