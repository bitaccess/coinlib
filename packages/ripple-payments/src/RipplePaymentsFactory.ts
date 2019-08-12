import { PaymentsFactory } from '@faast/payments-common'

import { RipplePaymentsConfig, HdRipplePaymentsConfig, AccountRipplePaymentsConfig } from './types'
import { HdRipplePayments } from './HdRipplePayments'
import { AccountRipplePayments } from './AccountRipplePayments'

export class RipplePaymentsFactory implements PaymentsFactory<RipplePaymentsConfig> {
  forConfig(config: HdRipplePaymentsConfig): HdRipplePayments
  forConfig(config: AccountRipplePaymentsConfig): AccountRipplePayments
  forConfig(config: RipplePaymentsConfig) {
    if (HdRipplePaymentsConfig.is(config)) {
      return new HdRipplePayments(config)
    }
    if (AccountRipplePaymentsConfig.is(config)) {
      return new AccountRipplePayments(config)
    }
    throw new Error('Cannot instantiate ripple payments for unsupported config')
  }
}

export default RipplePaymentsFactory
