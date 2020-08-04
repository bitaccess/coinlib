import { PaymentsFactory } from '@faast/payments-common'
import {
  BitcoinCashPaymentsConfig,
  HdBitcoinCashPaymentsConfig,
  KeyPairBitcoinCashPaymentsConfig,
} from './types'
import { HdBitcoinCashPayments } from './HdBitcoinCashPayments'
import { KeyPairBitcoinCashPayments } from './KeyPairBitcoinCashPayments'

export class BitcoinCashPaymentsFactory implements PaymentsFactory<BitcoinCashPaymentsConfig> {
  forConfig(config: BitcoinCashPaymentsConfig) {
    if (HdBitcoinCashPaymentsConfig.is(config)) {
      return new HdBitcoinCashPayments(config)
    }
    if (KeyPairBitcoinCashPaymentsConfig.is(config)) {
      return new KeyPairBitcoinCashPayments(config)
    }
    throw new Error('Cannot instantiate bitcoin cash payments for unsupported config')
  }
}

export default BitcoinCashPaymentsFactory
