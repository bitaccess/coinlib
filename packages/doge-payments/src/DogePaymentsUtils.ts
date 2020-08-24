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

  async getBlockBookFeeEstimate(feeLevel?: FeeLevel, networkType?: NetworkType): Promise<number> {
    const body = await this.getApi().doRequest('GET', '/api/v1/estimatefee/3')
    const fee = body['result']
    if (!fee) {
      throw new Error("Blockbook response is missing expected field 'result'")
    }
    const satPerByte = fee * 400000
    return feeLevel === 'high' ? satPerByte * 2 : feeLevel === 'low' ? satPerByte / 2 : satPerByte
  }
}
