import { PaymentsFactory } from '@faast/payments-common'

import { BitcoinPaymentsConfig, HdBitcoinPaymentsConfig, KeyPairBitcoinPaymentsConfig } from './types'
import { HdBitcoinPayments } from './HdBitcoinPayments'
import { KeyPairBitcoinPayments } from './KeyPairBitcoinPayments'

export class BitcoinPaymentsFactory implements PaymentsFactory<BitcoinPaymentsConfig> {
  forConfig(config: BitcoinPaymentsConfig) {
    if (HdBitcoinPaymentsConfig.is(config)) {
      return new HdBitcoinPayments(config)
    }
    if (KeyPairBitcoinPaymentsConfig.is(config)) {
      return new KeyPairBitcoinPayments(config)
    }
    throw new Error('Cannot instantiate bitcoin payments for unsupported config')
  }
}

export default BitcoinPaymentsFactory
