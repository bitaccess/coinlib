import { bitcoinish } from '@bitaccess/coinlib-bitcoin'

import { toBitcoinishConfig } from './utils'
import { DogePaymentsUtilsConfig } from './types'
import { isValidAddress, isValidPrivateKey, isValidPublicKey, standardizeAddress } from './helpers'
import { DEFAULT_FEE_LEVEL_BLOCK_TARGETS } from './constants'

export class DogePaymentsUtils extends bitcoinish.BitcoinishPaymentsUtils {
  constructor(config: DogePaymentsUtilsConfig = {}) {
    super(toBitcoinishConfig(config))
    this.feeLevelBlockTargets = config.feeLevelBlockTargets ?? DEFAULT_FEE_LEVEL_BLOCK_TARGETS
  }

  isValidAddress(address: string) {
    return isValidAddress(address, this.networkType)
  }

  standardizeAddress(address: string) {
    return standardizeAddress(address, this.networkType)
  }

  isValidPublicKey(publicKey: string) {
    return isValidPublicKey(publicKey, this.networkType)
  }

  isValidPrivateKey(privateKey: string) {
    return isValidPrivateKey(privateKey, this.networkType)
  }
}
