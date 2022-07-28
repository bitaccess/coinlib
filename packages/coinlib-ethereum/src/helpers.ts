import { NetworkType, bip32 } from '@bitaccess/coinlib-common'
import { ETHEREUM_COINTYPES, ETHEREUM_SUPPORTED_ADDRESS_TYPES } from './constants'

export function isSupportedAddressType(addressType: string): boolean {
  return ETHEREUM_SUPPORTED_ADDRESS_TYPES.map(at => at.toString()).includes(addressType)
}

export function getSupportedAddressTypes(): string[] {
  return ETHEREUM_SUPPORTED_ADDRESS_TYPES
}

export function determinePathForIndex(accountIndex: number, addressType?: any, networkType?: NetworkType): string {
  const purpose: string = '44'
  const cointype = ETHEREUM_COINTYPES[networkType ?? NetworkType.Mainnet]
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
