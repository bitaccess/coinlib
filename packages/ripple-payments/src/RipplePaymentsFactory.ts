import { PaymentsFactory } from '@faast/payments-common'

import { RipplePaymentsConfig, HdRipplePaymentsConfig, AccountRipplePaymentsConfig } from './types'
import { HdRipplePayments } from './HdRipplePayments'
import { AccountRipplePayments } from './AccountRipplePayments'
import { assertType } from '@faast/ts-common'

export class RipplePaymentsFactory implements PaymentsFactory<RipplePaymentsConfig> {
  forConfig(config: HdRipplePaymentsConfig): HdRipplePayments
  forConfig(config: AccountRipplePaymentsConfig): AccountRipplePayments
  forConfig(config: RipplePaymentsConfig) {
    if (AccountRipplePaymentsConfig.is(config)) {
      return new AccountRipplePayments(config)
    }
    return new HdRipplePayments(assertType(HdRipplePaymentsConfig, config))
  }
}

export default RipplePaymentsFactory
