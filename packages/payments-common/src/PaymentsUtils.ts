import { Numeric } from '@faast/ts-common'
import { Payport, BaseConfig, NetworkType } from './types'

export abstract class PaymentsUtils {
  networkType: NetworkType

  constructor(config: BaseConfig) {
    this.networkType = config.network || NetworkType.Mainnet
  }

  /**
   * Converts to main denomination units
   * Example: convert "125000000000" moneroj to "0.125" XMR
   */
  abstract toMainDenomination<O extends object>(amount: Numeric, options?: O): string

  /**
   * Converts to base atomic units
   * Example: convert "0.125" XMR to "125000000000" moneroj
   */
  abstract toBaseDenomination<O extends object>(amount: Numeric, options?: O): string

  /**
   * Return true if it's a valid address.
   */
  abstract isValidAddress<O extends object>(address: string, options?: O): Promise<boolean>

  /**
   * Return true if it's a valid extra ID.
   */
  abstract isValidExtraId<O extends object>(extraId: string, options?: O): Promise<boolean>

  /**
   * Return true if it's a valid payport.
   */
  async isValidPayport<O extends object>(payport: Payport, options?: O): Promise<boolean> {
    const { address, extraId } = payport
    return (
      (await this.isValidAddress(address, options)) &&
      (typeof extraId === 'string' ? this.isValidExtraId(extraId, options) : true)
    )
  }
}
