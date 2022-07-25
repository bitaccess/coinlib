import * as bip39 from 'bip39'
import { bip32 } from '@bitaccess/coinlib-common'

export function keysOf<T extends { [k: string]: any } | { [k: number]: any }>(o: T): (keyof T)[] {
  return Object.keys(o) as (keyof T)[]
}

/** Used to generate root xpub fingerprint when establishing signer */
export function getSeedHexFromMnemonic(mnemonic: string): string {
  const seed = bip39.mnemonicToSeedSync(mnemonic)
  return seed.toString("hex")
}

export function getFingerprintFromSeedHex(seedHex: string): string {
  const seed = Buffer.from(seedHex, 'hex')
  const root = bip32.fromSeed(seed)
  return root.fingerprint.toString('hex')
}