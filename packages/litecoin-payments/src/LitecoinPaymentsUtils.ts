import { bitcoinish } from '@faast/bitcoin-payments'
import { toBitcoinishConfig } from './utils'
import { LitecoinPaymentsUtilsConfig, LitecoinAddressFormat } from './types'
import { isValidAddress, isValidPrivateKey, standardizeAddress } from './helpers'
import { AutoFeeLevels, FeeRate } from '@faast/payments-common'

export class LitecoinPaymentsUtils extends bitcoinish.BitcoinishPaymentsUtils {

  readonly blockcypherToken?: string

  constructor(config: LitecoinPaymentsUtilsConfig = {}) {
    super(toBitcoinishConfig(config))
    this.blockcypherToken = config.blockcypherToken
  }

  isValidAddress(address: string, options?: { format?: string }) {
    return isValidAddress(address, this.networkType, options)
  }

  standardizeAddress(address: string, options?: { format?: string }): string | null {
    return standardizeAddress(address, this.networkType, options)
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
