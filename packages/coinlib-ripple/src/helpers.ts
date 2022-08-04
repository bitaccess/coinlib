import { createUnitConverters, NetworkType, bip32 } from '@bitaccess/coinlib-common'
import {
  DECIMAL_PLACES,
  XPRV_REGEX,
  XPUB_REGEX,
  ADDRESS_REGEX,
  EXTRA_ID_REGEX,
  RIPPLE_COINTYPES,
  RIPPLE_SUPPORTED_ADDRESS_TYPES,
} from './constants'
import { isNil } from '@bitaccess/ts-common'

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
    throw new Error(`Invalid ripple address: ${address}`)
  }
}

export function assertValidExtraId(extraId: string): void {
  if (!isValidExtraId(extraId)) {
    throw new Error(`Invalid ripple extraId: ${extraId}`)
  }
}

export function assertValidExtraIdOrNil(extraId?: string | undefined | null): void {
  if (!isNil(extraId) && !isValidExtraId(extraId)) {
    throw new Error(`Invalid ripple extraId: ${extraId}`)
  }
}

export function isSupportedAddressType(addressType: string): boolean {
  return RIPPLE_SUPPORTED_ADDRESS_TYPES.map(at => at.toString()).includes(addressType)
}

export function getSupportedAddressTypes(): string[] {
  return RIPPLE_SUPPORTED_ADDRESS_TYPES
}

export function determinePathForIndex(accountIndex: number, addressType?: any, networkType?: NetworkType): string {
  const purpose: string = '44'
  const cointype = RIPPLE_COINTYPES[networkType ?? NetworkType.Mainnet]
  const derivationPath = `m/${purpose}'/${cointype}'/${accountIndex}'`
  return derivationPath
}

export function hexSeedToBuffer(seedHex: string): Buffer {
  const seedBuffer = Buffer.from(seedHex, 'hex')
  return seedBuffer
}

export function deriveUniPubKeyForPath(seed: Buffer, derivationPath: string): string {
  const root = bip32.fromSeed(seed)
  const account = root.derivePath(derivationPath)
  return account.neutered().toBase58()
}
