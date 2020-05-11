import { PaymentsFactory } from '@faast/payments-common'
import {
  EthereumPaymentsConfig,
  HdEthereumPaymentsConfig,
  KeyPairEthereumPaymentsConfig,
  HdErc20PaymentsConfig,
  KeyPairErc20PaymentsConfig,
} from './types'
import { HdEthereumPayments } from './HdEthereumPayments'
import { KeyPairEthereumPayments } from './KeyPairEthereumPayments'
import { HdErc20Payments } from './erc20/HdErc20Payments'
import { KeyPairErc20Payments } from './erc20/KeyPairErc20Payments'

export class EthereumPaymentsFactory implements PaymentsFactory<EthereumPaymentsConfig> {
  forConfig(config: HdErc20PaymentsConfig): HdErc20Payments
  forConfig(config: KeyPairErc20PaymentsConfig): KeyPairErc20Payments
  forConfig(config: HdEthereumPaymentsConfig): HdEthereumPayments
  forConfig(config: KeyPairEthereumPaymentsConfig): KeyPairEthereumPayments

  forConfig(config: EthereumPaymentsConfig) {
    if (HdErc20PaymentsConfig.is(config)) {
      return new HdErc20Payments(config)
    }
    if (KeyPairErc20PaymentsConfig.is(config)) {
      throw new Error('Cannot instantiate ethereum payments for unsupported config')
      // return new KeyPairErc20Payments()
    }
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
