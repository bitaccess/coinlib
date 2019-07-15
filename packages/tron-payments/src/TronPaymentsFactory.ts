import { PaymentsFactory } from '@faast/payments-common'

import { TronPaymentsConfig, HdTronPaymentsConfig, KeyPairTronPaymentsConfig } from './types'
import { HdTronPayments } from './HdTronPayments'
import { KeyPairTronPayments } from './KeyPairTronPayments'

export class TronPaymentsFactory implements PaymentsFactory<TronPaymentsConfig> {
  forConfig(config: HdTronPaymentsConfig): HdTronPayments
  forConfig(config: KeyPairTronPaymentsConfig): KeyPairTronPayments
  forConfig(config: TronPaymentsConfig) {
    if (HdTronPaymentsConfig.is(config)) {
      return new HdTronPayments(config)
    }
    if (KeyPairTronPaymentsConfig.is(config)) {
      return new KeyPairTronPayments(config)
    }
    throw new Error('Cannot instantiate tron payments for unsupported config')
  }
}

export default TronPaymentsFactory
