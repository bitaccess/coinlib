import BigNumber from 'bignumber.js'
import { Numeric } from '@faast/ts-common'

export function createUnitConverters(decimals: number) {
  const basePerMain = new BigNumber(10).pow(decimals)

  function toMainDenominationBigNumber(baseNumeric: Numeric): BigNumber {
    const baseUnits = new BigNumber(baseNumeric)
    if (baseUnits.isNaN()) {
      throw new Error('Cannot convert to main denomination - not a number')
    }
    if (!baseUnits.isFinite()) {
      throw new Error('Cannot convert to main denomination - not finite')
    }
    return baseUnits.div(basePerMain)
  }

  function toMainDenominationString(baseNumeric: Numeric): string {
    return toMainDenominationBigNumber(baseNumeric).toString()
  }

  function toMainDenominationNumber(baseNumeric: Numeric): number {
    return toMainDenominationBigNumber(baseNumeric).toNumber()
  }

  function toBaseDenominationBigNumber(mainNumeric: Numeric): BigNumber {
    const mainUnits = new BigNumber(mainNumeric)
    if (mainUnits.isNaN()) {
      throw new Error('Cannot convert to base denomination - not a number')
    }
    if (!mainUnits.isFinite()) {
      throw new Error('Cannot convert to base denomination - not finite')
    }
    return mainUnits.times(basePerMain)
  }

  function toBaseDenominationString(mainNumeric: Numeric): string {
    return toBaseDenominationBigNumber(mainNumeric).toString()
  }

  function toBaseDenominationNumber(mainNumeric: Numeric): number {
    return toBaseDenominationBigNumber(mainNumeric).toNumber()
  }

  return {
    toMainDenominationBigNumber,
    toMainDenominationNumber,
    toMainDenominationString,
    toBaseDenominationBigNumber,
    toBaseDenominationNumber,
    toBaseDenominationString,
  }
}
