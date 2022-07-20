import { EthereumSignatory } from './types'
import { pubToAddress } from 'ethereumjs-util'
import { generateNewSeed, HdKeyUtils, isValidHdKey, isValidXprv, isValidXpub } from "@bitaccess/coinlib-common"

import { DEFAULT_DERIVATION_PATH } from './constants'
import { buffToHex } from './utils'

export { isValidHdKey, isValidXprv, isValidXpub }

export class EthereumBIP44 extends HdKeyUtils {
  static fromXKey(xkey: string, derivationPath: string = DEFAULT_DERIVATION_PATH) {
    return new EthereumBIP44(xkey, derivationPath)
  }

  static fromSeed(seed: string | Buffer, derivationPath: string = DEFAULT_DERIVATION_PATH) {
    return new EthereumBIP44(seed, derivationPath)
  }

  static generateNewKeys(derivationPath: string = DEFAULT_DERIVATION_PATH) {
    return new EthereumBIP44(generateNewSeed(), derivationPath)
  }

  publicKeyToAddress(pubKeyBuffer: Buffer): string {
    return buffToHex(pubToAddress(pubKeyBuffer, true))
  }

  publicKeyToString(pubKeyBuffer: Buffer): string {
    return buffToHex(pubKeyBuffer)
  }

  privateKeyToString(privateKeyBuffer: Buffer): string {
    return buffToHex(privateKeyBuffer)
  }

  getSignatory(index: number): EthereumSignatory {
    return {
      address: this.getAddress(index),
      keys: {
        pub: this.getPublicKey(index),
        prv: this.getPrivateKey(index) ?? '',
      },
      xkeys: {
        xprv: this.getXPrivateKey() ?? '',
        xpub: this.getXPublicKey(),
      },
    }
  }
}
