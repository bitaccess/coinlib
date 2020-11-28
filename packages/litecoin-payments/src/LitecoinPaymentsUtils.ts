import { BitcoinishPaymentsUtils, getBlockcypherFeeRecommendation } from '@faast/bitcoin-payments'
import { toBitcoinishConfig } from './utils'
import { LitecoinPaymentsUtilsConfig } from './types'
import { isValidAddress, isValidPrivateKey } from './helpers'
import { AutoFeeLevels, FeeRate } from '@faast/payments-common'

export class LitecoinPaymentsUtils extends BitcoinishPaymentsUtils {

  readonly blockcypherToken?: string

  constructor(config: LitecoinPaymentsUtilsConfig = {}) {
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
