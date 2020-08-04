import { BitcoinishPaymentsUtils } from '@faast/bitcoin-payments'
import { toBitcoinishConfig } from './utils'
import { BitcoinCashPaymentsUtilsConfig } from './types'
import { isValidAddress, isValidPrivateKey } from './helpers'

export class BitcoinCashPaymentsUtils extends BitcoinishPaymentsUtils {
  constructor(config: BitcoinCashPaymentsUtilsConfig = {}) {
    super(toBitcoinishConfig(config))
  }

  async isValidAddress(address: string) {
    return isValidAddress(address, this.bitcoinjsNetwork)
  }

  async isValidPrivateKey(privateKey: string) {
    return isValidPrivateKey(privateKey, this.bitcoinjsNetwork)
  }
}
