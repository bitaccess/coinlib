import {
  BalanceResult,
  BaseUnsignedTransaction,
  BaseSignedTransaction,
  BaseTransactionInfo,
  BaseBroadcastResult,
  CreateTransactionOptions,
  FeeOption,
  ResolvedFeeOption,
} from './types'

export type AnyPayments = PaymentsInterface<
  BaseUnsignedTransaction,
  BaseSignedTransaction,
  BaseBroadcastResult,
  BaseTransactionInfo
>

/**
 * An interface that provides the necessary tools for accepting and sending payments for a currency.
 */
export interface PaymentsInterface<
  UnsignedTransaction extends BaseUnsignedTransaction,
  SignedTransaction extends BaseSignedTransaction,
  BroadcastResult extends BaseBroadcastResult,
  TransactionInfo extends BaseTransactionInfo
> {
  // The following static methods should also be implemented
  //
  // static toMainDenomination<O extends object>(amount: number | string, options?: O): string
  // static toBaseDenomination<O extends object>(amount: number | string, options?: O): string
  // static isValidAddress<O extends object>(address: string, options?: O): boolean

  /**
   * Converts to main denomination units
   * Example: convert "125000000000" moneroj to "0.125" XMR
   */
  toMainDenomination<O extends object>(amount: number | string, options?: O): string

  /**
   * Converts to base atomic units
   * Example: convert "0.125" XMR to "125000000000" moneroj
   */
  toBaseDenomination<O extends object>(amount: number | string, options?: O): string

  /**
   * Return true if it's a valid address.
   */
  isValidAddress<O extends object>(address: string, options?: O): boolean

  resolveAddress<O extends object>(addressOrIndex: string | number, options?: O): Promise<string>

  resolveFromTo<O extends object>(
    from: string | number,
    to: string | number,
    options?: O,
  ): Promise<{
    fromIndex: number
    fromAddress: string
    toIndex: number | null
    toAddress: string
  }>

  /**
   * Get the index of the provided address.
   *
   * @return Promise resolving to address index
   * @throws if not a valid address or not owned by the wallet
   */
  getAddressIndex<O extends object>(address: string, options?: O): Promise<number>

  /** Same as getAddressIndex but returns null instead of throwing */
  getAddressIndexOrNull<O extends object>(address: string, options?: O): Promise<number | null>

  /**
   * Get the address for the specified index.
   *
   * @return Promise resolving to the address at that index
   * @throws if index < 0 or address cannot be returned for any reason
   */
  getAddress<O extends object>(index: number, options?: O): Promise<string>

  /** Same as getAddress but returns null instead of throwing */
  getAddressOrNull<O extends object>(index: number, options?: O): Promise<string | null>

  /**
   * Get the balance of an address (or address at `index`).
   *
   * @param addressOrIndex - The address or address index to get the balance of
   * @return The balance and unconfirmed balance formatted as a string in the main denomination (eg "0.125" XMR)
   */
  getBalance<O extends object>(addressOrIndex: string | number, options?: O): Promise<BalanceResult>

  /**
   * Get the info and status of a transaction.
   *
   * @param txId - The transaction ID to lookup
   * @param addressOrIndex - The address, or the index of an address, that is associated with this transaction.
   * This is necessary to allow for looking up XMR txs but can be ignored for conventional coins like BTC/ETH.
   * @returns Info about the transaction
   * @throws Error if transaction is not found
   */
  getTransactionInfo<O extends object>(
    txId: string,
    addressOrIndex: string | number,
    options?: O,
  ): Promise<TransactionInfo>

  resolveFeeOption<O extends FeeOption>(feeOption: O): Promise<ResolvedFeeOption>

  /**
   * Creates and signs a new payment transaction sending `amount` from address `from` to address `to`.
   *
   * @param from - The address to send from, or the address index.
   * @param to - The address of the recipient, or the address index.
   * @param amount - The amount to send in the main denomination (eg "0.125" XMR)
   * @returns An object representing the signed transaction
   */
  createTransaction<O extends CreateTransactionOptions>(
    from: string | number,
    to: string | number,
    amount: string,
    options?: O,
  ): Promise<UnsignedTransaction>

  /**
   * Creates a new payment transaction sending the entire balance of address `from` to address `to`.
   */
  createSweepTransaction<O extends CreateTransactionOptions>(
    from: string | number,
    to: string | number,
    options?: O,
  ): Promise<UnsignedTransaction>

  /**
   * Signs and returns unsigned transaction.
   *
   * @param from - The address to send from, or the address index.
   * @param to - The address of the recipient, or the address index.
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
