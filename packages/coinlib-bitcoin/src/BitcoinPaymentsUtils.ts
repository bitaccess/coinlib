import { BitcoinishPaymentsUtils } from './bitcoinish'
import { toBitcoinishConfig } from './utils'
import { BitcoinPaymentsUtilsConfig } from './types'
import { isValidAddress, isValidPrivateKey, standardizeAddress, isValidPublicKey } from './helpers'

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
}
