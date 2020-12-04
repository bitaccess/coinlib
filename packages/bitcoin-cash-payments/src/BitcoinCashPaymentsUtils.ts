import { bitcoinish } from '@faast/bitcoin-payments'
import { AutoFeeLevels, FeeRate } from '@faast/payments-common'
import { toBitcoinishConfig } from './utils'
import { BitcoinCashPaymentsUtilsConfig } from './types'
import { isValidAddress, isValidPrivateKey, isValidPublicKey, standardizeAddress } from './helpers'

export class BitcoinCashPaymentsUtils extends bitcoinish.BitcoinishPaymentsUtils {
  constructor(config: BitcoinCashPaymentsUtilsConfig = {}) {
    super(toBitcoinishConfig(config))
  }

  isValidAddress(address: string, options?: { format?: string }) {
    return isValidAddress(address, this.networkType, options)
  }

  standardizeAddress(address: string, options?: { format?: string }) {
    return standardizeAddress(address, this.networkType, options)
  }

  isValidPublicKey(publicKey: string) {
    return isValidPublicKey(publicKey, this.networkType)
  }

  isValidPrivateKey(privateKey: string) {
    return isValidPrivateKey(privateKey, this.networkType)
  }

  async getFeeRateRecommendation(feeLevel: AutoFeeLevels): Promise<FeeRate> {
    return bitcoinish.getBlockbookFeeRecommendation(
      feeLevel,
      this.coinSymbol,
      this.networkType,
      this.getApi(),
      this.logger,
    )
  }
}
