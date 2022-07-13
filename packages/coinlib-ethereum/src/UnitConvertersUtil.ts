import { createUnitConverters } from '@bitaccess/coinlib-common'
import { UnitConverters } from './types'

export class UnitConvertersUtil {
  toMainDenominationBigNumber: UnitConverters['toMainDenominationBigNumber']
  toBaseDenominationBigNumber: UnitConverters['toMainDenominationBigNumber']
  toMainDenomination: UnitConverters['toMainDenominationString']
  toBaseDenomination: UnitConverters['toBaseDenominationString']

  toMainDenominationBigNumberNative: UnitConverters['toMainDenominationBigNumber']
  toBaseDenominationBigNumberNative: UnitConverters['toMainDenominationBigNumber']
  toMainDenominationNative: UnitConverters['toMainDenominationString']
  toBaseDenominationNative: UnitConverters['toBaseDenominationString']

  constructor(config: { coinDecimals?: number, nativeDecimals: number }) {
    const coinDecimals = config.coinDecimals ?? config.nativeDecimals

    const unitConverters = createUnitConverters(coinDecimals)
    this.toMainDenominationBigNumber = unitConverters.toMainDenominationBigNumber
    this.toBaseDenominationBigNumber = unitConverters.toBaseDenominationBigNumber
    this.toMainDenomination = unitConverters.toMainDenominationString
    this.toBaseDenomination = unitConverters.toBaseDenominationString

    const nativeUnitConverters = createUnitConverters(config.nativeDecimals)
    this.toMainDenominationBigNumberNative = nativeUnitConverters.toMainDenominationBigNumber
    this.toBaseDenominationBigNumberNative = nativeUnitConverters.toBaseDenominationBigNumber
    this.toMainDenominationNative = nativeUnitConverters.toMainDenominationString
    this.toBaseDenominationNative = nativeUnitConverters.toBaseDenominationString
  }

  getCustomUnitConverter(decimals: number) {
    return createUnitConverters(decimals)
  }
}
