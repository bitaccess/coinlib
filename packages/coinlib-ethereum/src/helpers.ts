import { NetworkType, bip32 } from '@bitaccess/coinlib-common'
import { ETHEREUM_COINTYPE_MAINNET, ETHEREUM_COINTYPE_TESTNET } from './constants'

export function determinePathForIndex(accountIndex: number, addressType?: any, networkType?: NetworkType): string {
  const LEGENCY = 'p2pkh'
  if (addressType && addressType?.toString() !== LEGENCY) {
    throw new TypeError(`Ethereum does not support this type ${addressType}`)
  }
  const purpose: string = '44'

  let cointype = ETHEREUM_COINTYPE_MAINNET
  if (networkType === NetworkType.Testnet) {
    cointype = ETHEREUM_COINTYPE_TESTNET
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
    throw new TypeError(`Purpose in derivationPath ${purpose} not supported by Ethereum`)
  }

  const root = bip32.fromSeed(seed)
  const account = root.derivePath(derivationPath)
  return account.neutered().toBase58()
}
