import { PaymentsFactory } from '@faast/payments-common'
import {
  Erc20PaymentsConfig,
  HdErc20PaymentsConfig,
  KeyPairErc20PaymentsConfig
} from './types'
import HdErc20Payments from './HdErc20Payments'
import KeyPairErc20Payments from './KeyPairErc20Payments'

export class Erc20PaymentsFactory implements PaymentsFactory<Erc20PaymentsConfig> {
  forConfig(config: HdErc20PaymentsConfig): HdErc20Payments
  forConfig(config: KeyPairErc20PaymentsConfig): KeyPairErc20Payments

  forConfig(config: Erc20PaymentsConfig) {
    if (HdErc20PaymentsConfig.is(config)) {
      return new HdErc20Payments(config)
    }
    if (KeyPairErc20PaymentsConfig.is(config)) {
      throw new Error('Cannot instantiate ethereum payments for unsupported config')
      // return new KeyPairErc20Payments()
    }
    throw new Error('Cannot instantiate ethereum payments for unsupported config')
  }
}

export default Erc20PaymentsFactory
