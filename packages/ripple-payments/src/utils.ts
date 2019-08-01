import { createUnitConverters } from '@faast/payments-common'
import { DECIMAL_PLACES } from './constants'

/**
 * Source: https://github.com/ripple/ripple-lib/blob/develop/src/common/schemas/objects/address.json
 */
export const ADDRESS_REGEX = /^r[1-9A-HJ-NP-Za-km-z]{25,34}$/

export const EXTRA_ID_REGEX = /^[0-9]+$/

/**
 * Source: crypto-regex
 */
export const XPUB_REGEX = /^xpub[a-km-zA-HJ-NP-Z1-9]{100,108}$/
export const XPRV_REGEX = /^xprv[a-km-zA-HJ-NP-Z1-9]{100,108}$/

const {
  toMainDenominationBigNumber,
  toMainDenominationString,
  toMainDenominationNumber,
  toBaseDenominationBigNumber,
  toBaseDenominationString,
  toBaseDenominationNumber,
} = createUnitConverters(DECIMAL_PLACES)

export {
  toMainDenominationBigNumber,
  toMainDenominationString,
  toMainDenominationNumber,
  toBaseDenominationBigNumber,
  toBaseDenominationString,
  toBaseDenominationNumber,
}

export function padLeft(x: string, n: number, v: string): string {
  while (x.length < n) {
    x = `${v}${x}`
  }
  return x
}

export function isValidXprv(xprv: string): boolean {
  return XPRV_REGEX.test(xprv)
}

export function isValidXpub(xpub: string): boolean {
  return XPUB_REGEX.test(xpub)
}

export function isValidAddress(address: string): boolean {
  return ADDRESS_REGEX.test(address)
}

export function isValidExtraId(extraId: string): boolean {
  return EXTRA_ID_REGEX.test(extraId)
}
