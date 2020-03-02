import { PaymentsFactory } from '@faast/payments-common'
import {
  EthereumPaymentsConfig,
  HdEthereumPaymentsConfig,
  KeyPairEthereumPaymentsConfig
} from './types'
import { HdEthereumPayments } from './HdEthereumPayments'
import { KeyPairEthereumPayments } from './KeyPairEthereumPayments'

export class EthereumPaymentsFactory implements PaymentsFactory<EthereumPaymentsConfig> {
  forConfig(config: HdEthereumPaymentsConfig): HdEthereumPayments
  forConfig(config: KeyPairEthereumPaymentsConfig): KeyPairEthereumPayments

  forConfig(config: EthereumPaymentsConfig) {
    if (HdEthereumPaymentsConfig.is(config)) {
      return new HdEthereumPayments(config)
    }
    if (KeyPairEthereumPaymentsConfig.is(config)) {
      return new KeyPairEthereumPayments(config)
    }
    throw new Error('Cannot instantiate ethereum payments for unsupported config')
  }
}

export default EthereumPaymentsFactory
