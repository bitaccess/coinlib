import { BitcoinishPaymentsUtils } from './bitcoinish'
import { toBitcoinishConfig } from './utils'
import { BitcoinPaymentsUtilsConfig, BitcoinjsNetwork } from './types'
import {
  isValidAddress,
  isValidPrivateKey,
  standardizeAddress,
  isValidPublicKey,
  determinePathForIndex,
  deriveUniPubKeyForPath,
} from './helpers'
import { BitcoinishAddressType, NetworkType } from '@bitaccess/coinlib-common'

export class BitcoinPaymentsUtils extends BitcoinishPaymentsUtils {
  constructor(config: BitcoinPaymentsUtilsConfig = {}) {
    super(toBitcoinishConfig(config))
  }

  isValidAddress(address: string) {
    return isValidAddress(address, this.networkType)
  }

  standardizeAddress(address: string): string | null {
    return standardizeAddress(address, this.networkType)
  }

  isValidPublicKey(privateKey: string) {
    return isValidPublicKey(privateKey, this.networkType)
  }

  isValidPrivateKey(privateKey: string) {
    return isValidPrivateKey(privateKey, this.networkType)
  }

  determinePathForIndex(accountIndex: number, addressType?: BitcoinishAddressType): string {
    const networkType: NetworkType = this.networkType
    const derivationPath: string = determinePathForIndex(accountIndex, addressType, networkType)
    return derivationPath
  }

  deriveUniPubKeyForPath(seed: Buffer, derivationPath: string): string {
    const uniPubKey = deriveUniPubKeyForPath(seed, derivationPath)
    return uniPubKey
  }

}
