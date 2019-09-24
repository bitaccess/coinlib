import { PaymentsFactory } from '@faast/payments-common'

import { StellarPaymentsConfig, HdStellarPaymentsConfig, AccountStellarPaymentsConfig } from './types'
import { HdStellarPayments } from './HdStellarPayments'
import { AccountStellarPayments } from './AccountStellarPayments'
import { assertType } from '@faast/ts-common'

export class StellarPaymentsFactory implements PaymentsFactory<StellarPaymentsConfig> {
  forConfig(config: HdStellarPaymentsConfig): HdStellarPayments
  forConfig(config: AccountStellarPaymentsConfig): AccountStellarPayments
  forConfig(config: StellarPaymentsConfig) {
    if (AccountStellarPaymentsConfig.is(config)) {
      return new AccountStellarPayments(config)
    }
    return new HdStellarPayments(assertType(HdStellarPaymentsConfig, config))
  }
}

export default StellarPaymentsFactory
