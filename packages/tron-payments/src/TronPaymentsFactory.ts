import { PaymentsFactory } from '@faast/payments-common'

import { TronPaymentsConfig, HdTronPaymentsConfig, KeyPairTronPaymentsConfig } from './types'
import { HdTronPayments } from './HdTronPayments'
import { KeyPairTronPayments } from './KeyPairTronPayments'
import BaseTronPayments from './BaseTronPayments'

export class TronPaymentsFactory implements PaymentsFactory<BaseTronPayments> {
  forConfig(config: TronPaymentsConfig) {
    if ((config as HdTronPaymentsConfig).hdKey) {
      return new HdTronPayments(config as HdTronPaymentsConfig)
    }
    if ((config as KeyPairTronPaymentsConfig).keyPairs) {
      return new KeyPairTronPayments(config as KeyPairTronPaymentsConfig)
    }
    throw new Error('Cannot instantiate tron payments for unsupported config')
  }
}

export default TronPaymentsFactory
