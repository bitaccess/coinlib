import { HdEthereumPayments } from '..'
import { HdErc20PaymentsConfig } from './types'
import { BaseErc20Payments } from './BaseErc20Payments'
import { applyMixins } from './mixins'

class HdErc20Payments extends BaseErc20Payments<HdErc20PaymentsConfig> {
  constructor(config: HdErc20PaymentsConfig) {
    super(config)
  }
}
applyMixins(HdErc20Payments, [BaseErc20Payments, HdEthereumPayments]);

export default HdErc20Payments
