import { PaymentsFactory } from '@faast/payments-common'

import { BitcoinPaymentsConfig, HdBitcoinPaymentsConfig } from './types'
import { HdBitcoinPayments } from './HdBitcoinPayments'

export class BitcoinPaymentsFactory implements PaymentsFactory<BitcoinPaymentsConfig> {
  forConfig(config: BitcoinPaymentsConfig) {
    if (HdBitcoinPaymentsConfig.is(config)) {
      return new HdBitcoinPayments(config)
    }
    throw new Error('Cannot instantiate bitcoin payments for unsupported config')
  }
}

export default BitcoinPaymentsFactory
