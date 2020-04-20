import { PaymentsFactory } from '@faast/payments-common'

import {
  BitcoinPaymentsConfig,
  HdBitcoinPaymentsConfig,
  KeyPairBitcoinPaymentsConfig,
  MultisigBitcoinPaymentsConfig,
} from './types'
import { HdBitcoinPayments } from './HdBitcoinPayments'
import { KeyPairBitcoinPayments } from './KeyPairBitcoinPayments'
import { MultisigBitcoinPayments } from './MultisigBitcoinPayments'

export class BitcoinPaymentsFactory implements PaymentsFactory<BitcoinPaymentsConfig> {
  forConfig(config: BitcoinPaymentsConfig) {
    if (HdBitcoinPaymentsConfig.is(config)) {
      return new HdBitcoinPayments(config)
    }
    if (KeyPairBitcoinPaymentsConfig.is(config)) {
      return new KeyPairBitcoinPayments(config)
    }
    if (MultisigBitcoinPaymentsConfig.is(config)) {
      return new MultisigBitcoinPayments(config)
    }
    throw new Error('Cannot instantiate bitcoin payments for unsupported config')
  }
}

export default BitcoinPaymentsFactory
