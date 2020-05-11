import { PaymentsFactory } from '@faast/payments-common'

import {
  LitecoinPaymentsConfig,
  HdLitecoinPaymentsConfig,
  KeyPairLitecoinPaymentsConfig,
  MultisigLitecoinPaymentsConfig,
} from './types'
import { HdLitecoinPayments } from './HdLitecoinPayments'
import { KeyPairLitecoinPayments } from './KeyPairLitecoinPayments'
import { MultisigLitecoinPayments } from './MultisigLitecoinPayments'

export class LitecoinPaymentsFactory implements PaymentsFactory<LitecoinPaymentsConfig> {
  forConfig(config: LitecoinPaymentsConfig) {
    if (HdLitecoinPaymentsConfig.is(config)) {
      return new HdLitecoinPayments(config)
    }
    if (KeyPairLitecoinPaymentsConfig.is(config)) {
      return new KeyPairLitecoinPayments(config)
    }
    if (MultisigLitecoinPaymentsConfig.is(config)) {
      return new MultisigLitecoinPayments(config)
    }
    throw new Error('Cannot instantiate litecoin payments for unsupported config')
  }
}

export default LitecoinPaymentsFactory
