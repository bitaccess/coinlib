import { PaymentsFactory } from '@faast/payments-common'
import {
  DashPaymentsConfig,
  HdDashPaymentsConfig,
  KeyPairDashPaymentsConfig,
} from './types'
import { HdDashPayments } from './HdDashPayments'
import { KeyPairDashPayments } from './KeyPairDashPayments'

export class DashPaymentsFactory implements PaymentsFactory<DashPaymentsConfig> {
  forConfig(config: DashPaymentsConfig) {
    if (HdDashPaymentsConfig.is(config)) {
      return new HdDashPayments(config)
    }
    if (KeyPairDashPaymentsConfig.is(config)) {
      return new KeyPairDashPayments(config)
    }
    throw new Error('Cannot instantiate dash payments for unsupported config')
  }
}

export default DashPaymentsFactory
