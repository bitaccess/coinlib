import { StellarSignatory } from './types'
import StellarHDWallet from 'stellar-hd-wallet'
import * as bip39 from 'bip39'

export function deriveSignatory(seed: string, index: number): StellarSignatory {
  const wallet = seed.includes(' ') ? StellarHDWallet.fromMnemonic(seed) : StellarHDWallet.fromSeed(seed)
  const keypair = wallet.getKeypair(index)
  const secret = keypair.secret()
  const address = keypair.publicKey()
  return {
    address,
    secret,
  }
}

export function generateMnemonic(): string {
  return StellarHDWallet.generateMnemonic()
}

export function mnemonicToSeed(mnemonic: string): string {
  return bip39.mnemonicToSeedSync(mnemonic).toString('hex')
}
