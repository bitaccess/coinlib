import { BitcoinishPaymentsUtils } from '@faast/bitcoin-payments'
import { NetworkType, FeeLevel } from '@faast/payments-common'
import { toBitcoinishConfig } from './utils'
import { DogePaymentsUtilsConfig } from './types'
import { isValidAddress, isValidPrivateKey } from './helpers'

export class DogePaymentsUtils extends BitcoinishPaymentsUtils {
  constructor(config: DogePaymentsUtilsConfig = {}) {
    super(toBitcoinishConfig(config))
  }

  async isValidAddress(address: string) {
    return isValidAddress(address, this.bitcoinjsNetwork)
  }

  async isValidPrivateKey(privateKey: string) {
    return isValidPrivateKey(privateKey, this.bitcoinjsNetwork)
  }

}
