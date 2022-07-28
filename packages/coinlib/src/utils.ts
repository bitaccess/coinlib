import { bip32, bip39 } from '@bitaccess/coinlib-common'

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
