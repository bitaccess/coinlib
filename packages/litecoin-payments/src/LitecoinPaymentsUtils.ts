import { BitcoinishPaymentsUtils } from '@faast/bitcoin-payments/dist/lib/bitcoinish'
import { toBitcoinishConfig } from './utils'
import { LitecoinPaymentsUtilsConfig } from './types'
import { isValidAddress, isValidPrivateKey } from './helpers'

export class LitecoinPaymentsUtils extends BitcoinishPaymentsUtils {
  constructor(config: LitecoinPaymentsUtilsConfig = {}) {
    super(toBitcoinishConfig(config))
  }

  async isValidAddress(address: string) {
    return isValidAddress(address, this.bitcoinjsNetwork)
  }

  async isValidPrivateKey(privateKey: string) {
    return isValidPrivateKey(privateKey, this.bitcoinjsNetwork)
  }

}
