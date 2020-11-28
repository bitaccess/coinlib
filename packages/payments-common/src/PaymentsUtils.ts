import { Numeric } from '@faast/ts-common'
import { Payport, MaybePromise, AutoFeeLevels, FeeRate, NetworkType } from './types'

export interface PaymentsUtils {
  readonly networkType: NetworkType
  readonly coinSymbol: string
  readonly coinName: string
  readonly coinDecimals: number

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
  isValidAddress<O extends object>(address: string, options?: O): MaybePromise<boolean>

  /**
   * Return true if it's a valid extra ID.
   */
  isValidExtraId<O extends object>(extraId: string, options?: O): MaybePromise<boolean>

  /**
   * Return true if it's a valid payport.
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
