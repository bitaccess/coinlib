import { BitcoinishPaymentsUtils, getBlockbookFeeRecommendation } from '@faast/bitcoin-payments'
import { AutoFeeLevels, FeeRate } from '@faast/payments-common'
import { toBitcoinishConfig } from './utils'
import { BitcoinCashPaymentsUtilsConfig } from './types'
import { isValidAddress, isValidPrivateKey } from './helpers'

export class BitcoinCashPaymentsUtils extends BitcoinishPaymentsUtils {
  constructor(config: BitcoinCashPaymentsUtilsConfig = {}) {
    super(toBitcoinishConfig(config))
  }

  isValidAddress(address: string) {
    return isValidAddress(address, this.bitcoinjsNetwork)
  }

  isValidPrivateKey(privateKey: string) {
    return isValidPrivateKey(privateKey, this.bitcoinjsNetwork)
  }

  async getFeeRateRecommendation(feeLevel: AutoFeeLevels): Promise<FeeRate> {
    return getBlockbookFeeRecommendation(feeLevel, this.coinSymbol, this.networkType, this.getApi(), this.logger)
  }
}
