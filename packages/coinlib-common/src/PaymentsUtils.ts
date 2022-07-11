import { Numeric } from '@bitaccess/ts-common'
import {
  Payport, MaybePromise, AutoFeeLevels, FeeRate, NetworkType,
  UtxoInfo, BalanceResult, BaseTransactionInfo, BlockInfo, GetFeeRecommendationOptions, GetTransactionInfoOptions,
  BitcoinishAddressType
} from './types'

export interface PaymentsUtils {
  readonly networkType: NetworkType
  readonly coinSymbol: string
  readonly coinName: string
  readonly coinDecimals: number

  init(): Promise<void>
  destroy(): Promise<void>

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
   * Return true if it's a valid address.
   */
  isValidAddress<O extends { format?: string }>(address: string, options?: O): boolean

  /**
   * Return the address in a standardized format (ie checksum vs lowercase).
   * Return null if address isn't in any valid format.
   */
  standardizeAddress<O extends { format?: string }>(address: string, options?: O): string | null

  /**
   * Return true if it's a valid extra ID.
   */
  isValidExtraId<O extends object>(extraId: string, options?: O): boolean

  /**
   * Return true if it's a valid payport. Must be async to allow for ripple to check if the account has
   * requireDestinationTag set.
   */
  isValidPayport<O extends object>(payport: Payport, options?: O): MaybePromise<boolean>

  /**
   * Throw on invalid, undefined otherwise.
   */
  validatePayport<O extends object>(payport: Payport, options?: O): MaybePromise<void>

  /**
   * Return a validation message on invalid, undefined otherwise.
   */
  getPayportValidationMessage<O extends object>(payport: Payport, options?: O): MaybePromise<string | undefined>

  /**
   * Get a recommended fee for a certain level
   */
  getFeeRateRecommendation<O extends GetFeeRecommendationOptions = GetFeeRecommendationOptions>(
    level: AutoFeeLevels,
    options?: O,
  ): MaybePromise<FeeRate>

  /**
   * Returns the current block number as a string
   */
  getCurrentBlockNumber(): MaybePromise<number>

  /**
   * Return utxos for the provided address
   */
  getAddressUtxos(address: string): Promise<UtxoInfo[]>

  /**
   * Return true if the balance is likely sweepable
   * @param balance The balance to determine if sweepable
   * @param address Optionally the address the balance is for
   */
  isAddressBalanceSweepable(balance: Numeric, address?: string): boolean

  /**
   * Return the balance of an address
   */
  getAddressBalance(address: string): Promise<BalanceResult>

  /**
   * Get the next unused transaction sequenceNumber for an address.
   * @returns null if the network doesn't use sequence numbers, or if it cannot be determined.
   */
  getAddressNextSequenceNumber(address: string): Promise<string | null>

  /**
   * Get the info and status of a transaction.
   *
   * @param txId - The transaction ID to lookup
   * @param options - Additional options, such as change address classifiers
   * @returns Info about the transaction
   * @throws Error if transaction is not found
   */
  getTransactionInfo<O extends GetTransactionInfoOptions>(
    txId: string,
    options: O,
  ): Promise<BaseTransactionInfo>

  getBlock(id?: string | number): Promise<BlockInfo>

  determinePathForIndex(
    accountIndex: number,
    addressType?: BitcoinishAddressType,
  ): string

  deriveUniPubKeyForPath(seed: Buffer, derivationPath: string): string

}
