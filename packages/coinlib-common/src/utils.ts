import { BigNumber, bip32, HDNode, bs58 } from './SharedDependencies'
import { Numeric } from '@bitaccess/ts-common'
import { Bip32Network } from './types'

export function isMatchingError(e: Error, partialMessages: string[]) {
  const messageLower = e.toString().toLowerCase()
  return partialMessages.some(pm => messageLower.includes(pm.toLowerCase()))
}

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
    return toMainDenominationBigNumber(baseNumeric).toFixed()
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
    return mainUnits.times(basePerMain).dp(0, 7)
  }

  function toBaseDenominationString(mainNumeric: Numeric): string {
    return toBaseDenominationBigNumber(mainNumeric).toFixed(0, 7)
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

export function keysOf<T extends { [k: string]: any } | { [k: number]: any }>(o: T): (keyof T)[] {
  return Object.keys(o) as (keyof T)[]
}

export function prepend0x(s: string) {
  return s.startsWith('0x') ? s : `0x${s}`
}

export function strip0x(s: string) {
  return s.startsWith('0x') ? s.slice(2) : s
}

export function buffToHex(b: Buffer) {
  return prepend0x(b.toString('hex'))
}

export function hexToBuff(s: string) {
  return Buffer.from(strip0x(s), 'hex')
}

export function numericToHex(b: Numeric) {
  return `0x${new BigNumber(b).toString(16)}`
}
