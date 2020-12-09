import { Numeric } from '@faast/ts-common'
import { Payport, MaybePromise, AutoFeeLevels, FeeRate, NetworkType } from './types'

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
  getFeeRateRecommendation<O extends object>(level: AutoFeeLevels, options?: O): MaybePromise<FeeRate>
}
