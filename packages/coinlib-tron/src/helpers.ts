import TronWeb from 'tronweb'
import { DECIMAL_PLACES, TRON_COINTYPE_MAINNET, TRON_COINTYPE_TESTNET } from './constants'
import { createUnitConverters, NetworkType, bip32 } from '@bitaccess/coinlib-common'

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

export function isValidXprv(xprv: string): boolean {
  return xprv.startsWith('xprv')
}

export function isValidXpub(xpub: string): boolean {
  return xpub.startsWith('xpub')
}

export function isValidAddress(address: string): boolean {
  return TronWeb.isAddress(address)
}

export function isValidExtraId(extraId: string): boolean {
  return false
}

export function isValidPrivateKey(privateKey: string): boolean {
  try {
    privateKeyToAddress(privateKey)
    return true
  } catch (e) {
    return false
  }
}

export function privateKeyToAddress(privateKey: string): string {
  const address = TronWeb.address.fromPrivateKey(privateKey)
  if (isValidAddress(address)) {
    return address
  } else {
    throw new Error('Validation failed for address derived from private key')
  }
}

export function determinePathForIndex(accountIndex: number, addressType?: any, networkType?: NetworkType): string {
  const LEGENCY = 'p2pkh'
  if (addressType && addressType?.toString() !== LEGENCY) {
    throw new TypeError(`Tron does not support this type ${addressType}`)
  }
  const purpose: string = '44'

  let cointype = TRON_COINTYPE_MAINNET
  if (networkType === NetworkType.Testnet) {
    cointype = TRON_COINTYPE_TESTNET
  }

  const derivationPath = `m/${purpose}'/${cointype}'/${accountIndex}'`
  return derivationPath
}

export function hexSeedToBuffer(seedHex: string): Buffer {
  const seedBuffer = Buffer.from(seedHex, 'hex')
  return seedBuffer
}

export function deriveUniPubKeyForPath(seed: Buffer, derivationPath: string): string {
  const splitPath = derivationPath.split('/')
  if (splitPath?.length !== 4 || splitPath[0] !== 'm') {
    throw new TypeError(`Invalid derivationPath ${derivationPath}`)
  }

  const purpose = splitPath[1]
  if (purpose !== `44'`) {
    throw new TypeError(`Purpose in derivationPath ${purpose} not supported by Tron`)
  }

  const root = bip32.fromSeed(seed)
  const account = root.derivePath(derivationPath)
  return account.neutered().toBase58()
}
