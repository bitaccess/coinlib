import { KeyPairEthereumPayments } from '..'
import { KeyPairErc20PaymentsConfig } from './types'
import { BaseErc20Payments } from './BaseErc20Payments'
import { applyMixins } from './mixins'

class KeyPairErc20Payments extends BaseErc20Payments<KeyPairErc20PaymentsConfig> {
  constructor(config: KeyPairErc20PaymentsConfig) {
    super(config)
  }
}
applyMixins(KeyPairErc20Payments, [BaseErc20Payments, KeyPairEthereumPayments]);

export default KeyPairErc20Payments
