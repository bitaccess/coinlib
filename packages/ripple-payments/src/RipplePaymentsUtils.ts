import { PaymentsUtils, Payport, AutoFeeLevels, FeeLevel, FeeRate, FeeRateType } from '@faast/payments-common'
import { isNil, assertType } from '@faast/ts-common'

import {
  toMainDenominationString,
  toBaseDenominationString,
  isValidXprv,
  isValidXpub,
  isValidAddress,
  isValidExtraId,
} from './helpers'
import { BaseRippleConfig } from './types'
import { RippleConnected } from './RippleConnected'
import { DECIMAL_PLACES, COIN_NAME, COIN_SYMBOL, FEE_LEVEL_CUSHIONS } from './constants'

export class RipplePaymentsUtils extends RippleConnected implements PaymentsUtils {

  readonly coinSymbol = COIN_SYMBOL
  readonly coinName = COIN_NAME
  readonly coinDecimals = DECIMAL_PLACES

  constructor(config: BaseRippleConfig) {
    super(config)
  }

  isValidExtraId(extraId: string): boolean {
    return isValidExtraId(extraId)
  }

  isValidAddress(address: string): boolean {
    return isValidAddress(address)
  }

  standardizeAddress(address: string): string | null {
    if (!isValidAddress(address)) {
      return null
    }
    return address
  }

  private async _getPayportValidationMessage(payport: Payport): Promise<string | undefined> {
    const { address, extraId } = payport
    if (!(this.isValidAddress(address))) {
      return 'Invalid payport address'
    }
    let requireExtraId = false
    try {
      const settings = await this._retryDced(() => this.api.getSettings(address))
      requireExtraId = settings.requireDestinationTag || false
    } catch (e) {
      this.logger.log(`getPayportValidationMessage failed to retrieve settings for ${address} - ${e.message}`)
    }
    if (isNil(extraId)) {
      if (requireExtraId) {
        return `Payport extraId is required for address ${address} with ripple requireDestinationTag setting enabled`
      }
    } else if (!(this.isValidExtraId(extraId))) {
      return 'Invalid payport extraId'
    }
  }

  async getPayportValidationMessage(payport: Payport): Promise<string | undefined> {
    try {
      payport = assertType(Payport, payport, 'payport')
    } catch (e) {
      return e.message
    }
    return this._getPayportValidationMessage(payport)
  }

  async validatePayport(payport: Payport): Promise<void> {
    payport = assertType(Payport, payport, 'payport')
    const message = await this._getPayportValidationMessage(payport)
    if (message) {
      throw new Error(message)
    }
  }

  async isValidPayport(payport: Payport): Promise<boolean> {
    if (!Payport.is(payport)) {
      return false
    }
    return !(await this._getPayportValidationMessage(payport))
  }

  toMainDenomination(amount: string | number): string {
    return toMainDenominationString(amount)
  }

  toBaseDenomination(amount: string | number): string {
    return toBaseDenominationString(amount)
  }

  isValidXprv = isValidXprv
  isValidXpub = isValidXpub

  async getFeeRateRecommendation(level: AutoFeeLevels): Promise<FeeRate> {
    const feeMain = await this._retryDced(() => this.api.getFee(FEE_LEVEL_CUSHIONS[level]))
    return {
      feeRate: feeMain,
      feeRateType: FeeRateType.Main
    }
  }
}
