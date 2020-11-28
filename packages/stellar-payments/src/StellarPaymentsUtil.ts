import { AutoFeeLevels, FeeLevel, FeeRate, FeeRateType, PaymentsUtils, Payport } from '@faast/payments-common'
import { isNil, assertType, Numeric } from '@faast/ts-common'

import {
  toMainDenominationString,
  toBaseDenominationString,
  isValidAddress,
  isValidExtraId,
} from './helpers'
import { StellarConnected } from './StellarConnected'
import { COIN_NAME, COIN_SYMBOL, DECIMAL_PLACES } from './constants'

export class StellarPaymentsUtils extends StellarConnected implements PaymentsUtils {

  readonly coinSymbol = COIN_SYMBOL
  readonly coinName = COIN_NAME
  readonly coinDecimals = DECIMAL_PLACES

  async isValidExtraId(extraId: string): Promise<boolean> {
    return isValidExtraId(extraId)
  }

  async isValidAddress(address: string): Promise<boolean> {
    return isValidAddress(address)
  }

  async _getPayportValidationMessage(payport: Payport): Promise<string | undefined> {
    const { address, extraId } = payport
    if (!(await this.isValidAddress(address))) {
      return 'Invalid payport address'
    }
    if (!isNil(extraId) && !(await this.isValidExtraId(extraId))) {
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
    assertType(Payport, payport, 'payport')
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

  toMainDenomination(amount: Numeric): string {
    return toMainDenominationString(amount)
  }

  toBaseDenomination(amount: Numeric): string {
    return toBaseDenominationString(amount)
  }

  async getFeeRateRecommendation(level: AutoFeeLevels): Promise<FeeRate> {
    const feeStats = await this._retryDced(() => this.getApi().feeStats())
    let feeBase = feeStats.fee_charged.p10
    if (level === FeeLevel.Medium) {
      feeBase = feeStats.fee_charged.p50
    } else if (level === FeeLevel.High) {
      feeBase = feeStats.fee_charged.p95
    }
    return {
      feeRate: feeBase,
      feeRateType: FeeRateType.Base
    }
  }

}
