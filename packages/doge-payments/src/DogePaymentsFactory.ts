import { PaymentsFactory } from '@faast/payments-common'
import {
  DogePaymentsConfig,
  HdDogePaymentsConfig,
  KeyPairDogePaymentsConfig,
} from './types'
import { HdDogePayments } from './HdDogePayments'
import { KeyPairDogePayments } from './KeyPairDogePayments'

export class DogePaymentsFactory implements PaymentsFactory<DogePaymentsConfig> {
  forConfig(config: DogePaymentsConfig) {
    if (HdDogePaymentsConfig.is(config)) {
      return new HdDogePayments(config)
    }
    if (KeyPairDogePaymentsConfig.is(config)) {
      return new KeyPairDogePayments(config)
    }
    throw new Error('Cannot instantiate dash payments for unsupported config')
  }
}

export default DogePaymentsFactory
