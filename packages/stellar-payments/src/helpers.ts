import { createUnitConverters } from '@faast/payments-common'
import { DECIMAL_PLACES, XPRV_REGEX, XPUB_REGEX, ADDRESS_REGEX, EXTRA_ID_REGEX } from './constants'
import { isNil } from '@faast/ts-common'

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

export function isValidXprv(xprv: unknown): boolean {
  return typeof xprv === 'string' && XPRV_REGEX.test(xprv)
}

export function isValidXpub(xpub: unknown): boolean {
  return typeof xpub === 'string' && XPUB_REGEX.test(xpub)
}

export function isValidAddress(address: unknown): boolean {
  return typeof address === 'string' && ADDRESS_REGEX.test(address)
}

export function isValidExtraId(extraId: unknown): boolean {
  return typeof extraId === 'string' && EXTRA_ID_REGEX.test(extraId)
}

export function assertValidAddress(address: string): void {
  if (!isValidAddress(address)) {
    throw new Error(`Invalid stellar address: ${address}`)
  }
}

export function assertValidExtraId(extraId: string): void {
  if (!isValidExtraId(extraId)) {
    throw new Error(`Invalid stellar extraId: ${extraId}`)
  }
}

export function assertValidExtraIdOrNil(extraId?: string | undefined | null): void {
  if (!isNil(extraId) && !isValidExtraId(extraId)) {
    throw new Error(`Invalid stellar extraId: ${extraId}`)
  }
}
