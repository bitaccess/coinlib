import { BitcoinishPaymentsUtils, getBlockcypherFeeRecommendation } from './bitcoinish'
import { toBitcoinishConfig } from './utils'
import { BitcoinPaymentsUtilsConfig } from './types'
import { isValidAddress, isValidPrivateKey, standardizeAddress, isValidPublicKey } from './helpers'
import { AutoFeeLevels, FeeRate } from '@bitaccess/coinlib-common'

export class BitcoinPaymentsUtils extends BitcoinishPaymentsUtils {

  readonly blockcypherToken?: string

  constructor(config: BitcoinPaymentsUtilsConfig = {}) {
    super(toBitcoinishConfig(config))
    this.blockcypherToken = config.blockcypherToken
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

  async getFeeRateRecommendation(feeLevel: AutoFeeLevels): Promise<FeeRate> {
    return getBlockcypherFeeRecommendation(
      feeLevel, this.coinSymbol, this.networkType, this.blockcypherToken, this.logger,
    )
  }

}
