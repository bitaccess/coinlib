import { BitcoinishPaymentsUtils } from './bitcoinish'
import { toBitcoinishConfig } from './utils'
import { BitcoinPaymentsUtilsConfig } from './types'
import { isValidAddress, isValidPrivateKey } from './helpers'

export class BitcoinPaymentsUtils extends BitcoinishPaymentsUtils {
  constructor(config: BitcoinPaymentsUtilsConfig = {}) {
    super(toBitcoinishConfig(config))
  }

  async isValidAddress(address: string) {
    return isValidAddress(address, this.bitcoinjsNetwork)
  }

  async isValidPrivateKey(privateKey: string) {
    return isValidPrivateKey(privateKey, this.bitcoinjsNetwork)
  }

}
