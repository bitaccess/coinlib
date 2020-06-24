import { PaymentsFactory } from '@faast/payments-common'

import {
  LitecoinPaymentsConfig,
  HdLitecoinPaymentsConfig,
  KeyPairLitecoinPaymentsConfig,
} from './types'
import { HdLitecoinPayments } from './HdLitecoinPayments'
import { KeyPairLitecoinPayments } from './KeyPairLitecoinPayments'

export class LitecoinPaymentsFactory implements PaymentsFactory<LitecoinPaymentsConfig> {
  forConfig(config: LitecoinPaymentsConfig) {
    if (HdLitecoinPaymentsConfig.is(config)) {
      return new HdLitecoinPayments(config)
    }
    if (KeyPairLitecoinPaymentsConfig.is(config)) {
      return new KeyPairLitecoinPayments(config)
    }
    throw new Error('Cannot instantiate litecoin payments for unsupported config')
  }
}

export default LitecoinPaymentsFactory
