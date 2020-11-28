import { BitcoinishPaymentsUtils, getBlockcypherFeeRecommendation } from './bitcoinish'
import { toBitcoinishConfig } from './utils'
import { BitcoinPaymentsUtilsConfig } from './types'
import { isValidAddress, isValidPrivateKey } from './helpers'
import { AutoFeeLevels, FeeRate } from '@faast/payments-common'

export class BitcoinPaymentsUtils extends BitcoinishPaymentsUtils {

  readonly blockcypherToken?: string

  constructor(config: BitcoinPaymentsUtilsConfig = {}) {
    super(toBitcoinishConfig(config))
    this.blockcypherToken = config.blockcypherToken
  }

  async isValidAddress(address: string) {
    return isValidAddress(address, this.bitcoinjsNetwork)
  }

  async isValidPrivateKey(privateKey: string) {
    return isValidPrivateKey(privateKey, this.bitcoinjsNetwork)
  }

  async getFeeRateRecommendation(feeLevel: AutoFeeLevels): Promise<FeeRate> {
    return getBlockcypherFeeRecommendation(
      feeLevel, this.coinSymbol, this.networkType, this.blockcypherToken, this.logger,
    )
  }

}
