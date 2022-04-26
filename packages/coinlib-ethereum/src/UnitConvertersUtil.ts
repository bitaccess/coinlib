import { createUnitConverters } from '@bitaccess/coinlib-common'
import { UnitConverters } from './types'

import { ETH_DECIMAL_PLACES } from './constants'

export class UnitConvertersUtil {
  toMainDenominationBigNumber: UnitConverters['toMainDenominationBigNumber']
  toBaseDenominationBigNumber: UnitConverters['toMainDenominationBigNumber']
  toMainDenomination: UnitConverters['toMainDenominationString']
  toBaseDenomination: UnitConverters['toBaseDenominationString']

  toMainDenominationBigNumberEth: UnitConverters['toMainDenominationBigNumber']
  toBaseDenominationBigNumberEth: UnitConverters['toMainDenominationBigNumber']
  toMainDenominationEth: UnitConverters['toMainDenominationString']
  toBaseDenominationEth: UnitConverters['toBaseDenominationString']
  coinDecimals: number

  constructor(config: { coinDecimals?: number }) {
    this.coinDecimals = config.coinDecimals ?? ETH_DECIMAL_PLACES

    const unitConverters = createUnitConverters(this.coinDecimals)
    this.toMainDenominationBigNumber = unitConverters.toMainDenominationBigNumber
    this.toBaseDenominationBigNumber = unitConverters.toBaseDenominationBigNumber
    this.toMainDenomination = unitConverters.toMainDenominationString
    this.toBaseDenomination = unitConverters.toBaseDenominationString

    const ethUnitConverters = createUnitConverters(ETH_DECIMAL_PLACES)
    this.toMainDenominationBigNumberEth = ethUnitConverters.toMainDenominationBigNumber
    this.toBaseDenominationBigNumberEth = ethUnitConverters.toBaseDenominationBigNumber
    this.toMainDenominationEth = ethUnitConverters.toMainDenominationString
    this.toBaseDenominationEth = ethUnitConverters.toBaseDenominationString
  }
}
