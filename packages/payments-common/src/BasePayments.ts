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
  ResolveablePayport,
  UtxoInfo,
} from './types'
import { PaymentsUtils } from './PaymentsUtils'

export type AnyPayments<C extends object = any> = BasePayments<
  C,
  BaseUnsignedTransaction,
  BaseSignedTransaction,
  BaseBroadcastResult,
  BaseTransactionInfo
>

/**
 * An interface that provides the necessary tools for accepting and sending payments for a currency.
 */
export interface BasePayments<
  Config extends BaseConfig,
  UnsignedTransaction extends BaseUnsignedTransaction,
  SignedTransaction extends BaseSignedTransaction,
  BroadcastResult extends BaseBroadcastResult,
  TransactionInfo extends BaseTransactionInfo,
> extends PaymentsUtils {
  /** Establishes any connections necessary for use */
  init(): Promise<void>

  /** Closes any connections that were opened in `init` */
  destroy(): Promise<void>

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
   * Return payport at index, or the payport itself.
   */
  resolvePayport<O extends object>(payport: ResolveablePayport, options?: O): Promise<Payport>

  /**
   * Resolve the from/to params of a transaction for the given payports.
   */
  resolveFromTo<O extends object>(from: number, to: ResolveablePayport, options?: O): Promise<FromTo>

  /**
   * Resolve the fee option to a defined fee amount. Used when creating a transaction. Usually
   * involves looking up current blockchain fee averages with an external service.
   */
  resolveFeeOption<O extends FeeOption>(feeOption: O): Promise<ResolvedFeeOption>

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
   * Return true if external balance tracking is required for payports with an extraId
   */
  requiresBalanceMonitor(): boolean

  /**
   * Get a payport by index for receiving deposits. index === 0 often refers to the hotwallet
   *
   * @param index An index of the payport to retrieve
   * @return Promise resolving to a payport at that index
   * @throws if index < 0 or payport cannot be returned for any reason
   */
  getPayport<O extends object>(index: number, options?: O): Promise<Payport>

  /**
   * Get the balance of a payport (or payport at `index`).
   *
   * @param payport - The payport to get the balance of
   * @return The balance and unconfirmed balance formatted as a string in the main denomination (eg "0.125" XMR)
   */
  getBalance<O extends object>(payport: ResolveablePayport, options?: O): Promise<BalanceResult>

  /**
   * Returns true if the payport could be swept at the specified balance. Useful when using BalanceMonitor to
   * externally track balances. If payport is unspecified assume it applies to a deposit payport rather than
   * a hot wallet.
   */
  isSweepableBalance(balance: string, payport?: ResolveablePayport): Promise<boolean> | boolean

  usesUtxos(): boolean

  /**
   * Get the unspent transaction outputs for the provided payport/address. Returns an empty list if utxos
   * not used by the network.
   */
  getUtxos(payport: ResolveablePayport): Promise<UtxoInfo[]>

  usesSequenceNumber(): boolean

  /**
   * Get the next unused transaction sequenceNumber for a payport.
   * @returns null if the network doesn't use sequence numbers, or if it cannot be determined.
   */
  getNextSequenceNumber(payport: ResolveablePayport): Promise<string | null>

  /**
   * Get the info and status of a transaction.
   *
   * @param txId - The transaction ID to lookup
   * @param payport - The payport, or the index of a payport, that is associated with this transaction.
   * This is necessary to allow for looking up XMR txs but can be ignored for conventional coins like BTC/ETH.
   * @returns Info about the transaction
   * @throws Error if transaction is not found
   */
  getTransactionInfo<O extends object>(
    txId: string,
    payport?: ResolveablePayport,
    options?: O,
  ): Promise<TransactionInfo>

  /**
   * Creates and signs a new payment transaction sending `amount` from payport `from` to payport `to`.
   *
   * @param from - The index of the payport to send from.
   * @param to - The payport of the recipient, or the payport index.
   * @param amount - The amount to send in the main denomination (eg "0.125" XMR)
   * @returns An object representing the signed transaction
   */
  createTransaction<O extends CreateTransactionOptions>(
    from: number,
    to: ResolveablePayport,
    amount: string,
    options?: O,
  ): Promise<UnsignedTransaction>

  /**
   * Creates a new payment transaction sending the entire balance of payport `from` to payport `to`.
   */
  createSweepTransaction<O extends CreateTransactionOptions>(
    from: number,
    to: ResolveablePayport,
    options?: O,
  ): Promise<UnsignedTransaction>

  /**
   * Signs and returns unsigned transaction.
   *
   * @param from - The index of the payport to send from.
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
