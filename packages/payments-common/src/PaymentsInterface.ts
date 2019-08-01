import { Numeric } from '@faast/ts-common'
import {
  BalanceResult,
  BaseUnsignedTransaction,
  BaseSignedTransaction,
  BaseTransactionInfo,
  BaseBroadcastResult,
  CreateTransactionOptions,
  FeeOption,
  ResolvedFeeOption,
  BaseConfig,
  Payport,
  FromTo,
} from './types'

export type AnyPayments<C extends object = any> = PaymentsInterface<
  C,
  BaseUnsignedTransaction,
  BaseSignedTransaction,
  BaseBroadcastResult,
  BaseTransactionInfo
>

/**
 * An interface that provides the necessary tools for accepting and sending payments for a currency.
 */
export interface PaymentsInterface<
  Config extends BaseConfig,
  UnsignedTransaction extends BaseUnsignedTransaction,
  SignedTransaction extends BaseSignedTransaction,
  BroadcastResult extends BaseBroadcastResult,
  TransactionInfo extends BaseTransactionInfo
> {
  // The following static methods should also be implemented
  //
  // static toMainDenomination<O extends object>(amount: number | string, options?: O): string
  // static toBaseDenomination<O extends object>(amount: number | string, options?: O): string
  // static isValidAddress<O extends object>(payport: string, options?: O): boolean

  /**
   * Converts to main denomination units
   * Example: convert "125000000000" moneroj to "0.125" XMR
   */
  toMainDenomination<O extends object>(amount: Numeric, options?: O): string

  /**
   * Converts to base atomic units
   * Example: convert "0.125" XMR to "125000000000" moneroj
   */
  toBaseDenomination<O extends object>(amount: Numeric, options?: O): string

  /**
   * Return true if it's a valid payport.
   */
  isValidPayport<O extends object>(payport: Payport, options?: O): boolean | Promise<boolean>

  resolvePayport<O extends object>(payportOrIndex: Payport | number, options?: O): Promise<Payport>

  resolveFromTo<O extends object>(from: Payport | number, to: Payport | number, options?: O): Promise<FromTo>

  /**
   * Returns the full config used to instantiate this payments instance as is.
   */
  getFullConfig(): Config

  /**
   * Returns the full config with private keys substituted with their public equivalent.
   * (e.g. xpub/addresses instead of xprv/private keys)
   */
  getPublicConfig(): Config

  /**
   * Return identifiers for all accounts configured.
   */
  getAccountIds(): string[]

  /**
   * Return identifier for account used for payport at `index` (an xpub or address works).
   *
   * @param index - The payport index to get account ID for
   */
  getAccountId(index: number): string

  /**
   * Get a payport by index for receiving deposits. index === 0 often refers to the hotwallet
   *
   * @param index An index of the payport to retrieve
   * @return Promise resolving to a payport at that index
   * @throws if index < 0 or payport cannot be returned for any reason
   */
  getPayport<O extends object>(index: number, options?: O): Promise<Payport>

  /**
   * Return true if external balance tracking is required for payports with an extraId
   */
  requiresBalanceTracker(): boolean

  /**
   * Get the balance of a payport (or payport at `index`).
   *
   * @param payportOrIndex - The payport or payport index to get the balance of
   * @return The balance and unconfirmed balance formatted as a string in the main denomination (eg "0.125" XMR)
   */
  getBalance<O extends object>(payportOrIndex: Payport | number, options?: O): Promise<BalanceResult>

  /**
   * Get the info and status of a transaction.
   *
   * @param txId - The transaction ID to lookup
   * @param payportOrIndex - The payport, or the index of a payport, that is associated with this transaction.
   * This is necessary to allow for looking up XMR txs but can be ignored for conventional coins like BTC/ETH.
   * @returns Info about the transaction
   * @throws Error if transaction is not found
   */
  getTransactionInfo<O extends object>(
    txId: string,
    payportOrIndex?: Payport | number,
    options?: O,
  ): Promise<TransactionInfo>

  resolveFeeOption<O extends FeeOption>(feeOption: O): Promise<ResolvedFeeOption>

  /**
   * Creates and signs a new payment transaction sending `amount` from payport `from` to payport `to`.
   *
   * @param from - The payport to send from, or the payport index.
   * @param to - The payport of the recipient, or the payport index.
   * @param amount - The amount to send in the main denomination (eg "0.125" XMR)
   * @returns An object representing the signed transaction
   */
  createTransaction<O extends CreateTransactionOptions>(
    from: Payport | number,
    to: Payport | number,
    amount: string,
    options?: O,
  ): Promise<UnsignedTransaction>

  /**
   * Creates a new payment transaction sending the entire balance of payport `from` to payport `to`.
   */
  createSweepTransaction<O extends CreateTransactionOptions>(
    from: Payport | number,
    to: Payport | number,
    options?: O,
  ): Promise<UnsignedTransaction>

  /**
   * Signs and returns unsigned transaction.
   *
   * @param from - The payport to send from, or the payport index.
   * @param to - The payport of the recipient, or the payport index.
   * @param amount - The amount to send in the main denomination (eg "0.125" XMR)
   * @returns An object representing the signed transaction
   */
  signTransaction<O extends object>(unsignedTx: UnsignedTransaction, options?: O): Promise<SignedTransaction>

  /**
   * Broadcasts the transaction specified by `signedTx`. Allows rebroadcasting prior transactions.
   *
   * @return An object containing the transaction id
   * @throws Error if the transaction is invalid, not signed, or fails to broadcast
   */
  broadcastTransaction<O extends object>(signedTx: SignedTransaction, options?: O): Promise<BroadcastResult>
}
