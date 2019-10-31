import { Numeric } from '@faast/ts-common'
import { Payport } from './types'

export interface PaymentsUtils {
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
  isValidAddress<O extends object>(address: string, options?: O): Promise<boolean>

  /**
   * Return true if it's a valid extra ID.
   */
  isValidExtraId<O extends object>(extraId: string, options?: O): Promise<boolean>

  /**
   * Return true if it's a valid payport.
   */
  isValidPayport<O extends object>(payport: Payport, options?: O): Promise<boolean>

  /**
   * Throw on invalid, undefined otherwise.
   */
  validatePayport<O extends object>(payport: Payport, options?: O): Promise<void>

  /**
   * Return a validation message on invalid, undefined otherwise.
   */
  getPayportValidationMessage<O extends object>(payport: Payport, options?: O): Promise<string | undefined>
}
