import { bitcoinish } from '@bitaccess/coinlib-bitcoin'
import { AutoFeeLevels, FeeRate } from '@bitaccess/coinlib-common'

import { toBitcoinishConfig } from './utils'
import { DogePaymentsUtilsConfig } from './types'
import { isValidAddress, isValidPrivateKey, isValidPublicKey, standardizeAddress } from './helpers'

export class DogePaymentsUtils extends bitcoinish.BitcoinishPaymentsUtils {

  readonly blockcypherToken?: string

  constructor(config: DogePaymentsUtilsConfig = {}) {
    super(toBitcoinishConfig(config))
    this.blockcypherToken = config.blockcypherToken
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

  async getFeeRateRecommendation(feeLevel: AutoFeeLevels): Promise<FeeRate> {
    return bitcoinish.getBlockcypherFeeRecommendation(
      feeLevel, this.coinSymbol, this.networkType, this.blockcypherToken, this.logger,
    )
  }

}
