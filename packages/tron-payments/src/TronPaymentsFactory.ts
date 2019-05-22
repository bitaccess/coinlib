import { PaymentsFactory } from '@faast/payments-common'

import { TronPaymentsConfig, HdTronPaymentsConfig, KeyPairTronPaymentsConfig } from './types'
import { HdTronPayments } from './HdTronPayments'
import { KeyPairTronPayments } from './KeyPairTronPayments'

export class TronPaymentsFactory implements PaymentsFactory<TronPaymentsConfig> {
  forConfig(config: HdTronPaymentsConfig): HdTronPayments
  forConfig(config: KeyPairTronPaymentsConfig): KeyPairTronPayments
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
