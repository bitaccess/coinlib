import { createUnitConverters } from '@faast/payments-common'
import { isNil } from '@faast/ts-common'
import * as Stellar from 'stellar-sdk'
import { isString } from 'util'

import { DECIMAL_PLACES, EXTRA_ID_REGEX } from './constants'

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

export function isValidAddress(address: unknown): boolean {
  return isString(address) && Stellar.StrKey.isValidEd25519PublicKey(address)
}

export function isValidExtraId(extraId: unknown): boolean {
  return isString(extraId) && EXTRA_ID_REGEX.test(extraId)
}

export function isValidSecret(secret: unknown): boolean {
  return isString(secret) && Stellar.StrKey.isValidEd25519SecretSeed(secret)
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
