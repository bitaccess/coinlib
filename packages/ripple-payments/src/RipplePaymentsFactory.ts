import { PaymentsFactory, StandardConnectionManager } from '@faast/payments-common'
import { assertType } from '@faast/ts-common'

import {
  RipplePaymentsConfig,
  HdRipplePaymentsConfig,
  AccountRipplePaymentsConfig,
  BaseRipplePaymentsConfig,
  RippleBalanceMonitorConfig,
  BaseRippleConfig,
  RippleServerAPI,
} from './types'
import { PACKAGE_NAME } from './constants'
import { BaseRipplePayments } from './BaseRipplePayments'
import { HdRipplePayments } from './HdRipplePayments'
import { AccountRipplePayments } from './AccountRipplePayments'
import { RipplePaymentsUtils } from './RipplePaymentsUtils'
import { RippleBalanceMonitor } from './RippleBalanceMonitor'
import { RippleConnected } from './RippleConnected'

export class RipplePaymentsFactory extends PaymentsFactory<
  BaseRippleConfig,
  RipplePaymentsUtils,
  BaseRipplePayments<BaseRippleConfig>,
  RippleBalanceMonitor
> {
  readonly packageName = PACKAGE_NAME

  newPayments(config: HdRipplePaymentsConfig): HdRipplePayments
  newPayments(config: AccountRipplePaymentsConfig): AccountRipplePayments
  newPayments(config: RipplePaymentsConfig) {
    if (AccountRipplePaymentsConfig.is(config)) {
      return new AccountRipplePayments(config)
    }
    if (HdRipplePaymentsConfig.is(config)) {
      return new HdRipplePayments(config)
    }
    throw new Error(`Cannot instantiate ${this.packageName} for unsupported config`)
  }

  newUtils(config: BaseRipplePaymentsConfig) {
    return new RipplePaymentsUtils(assertType(BaseRipplePaymentsConfig, config, 'config'))
  }

  hasBalanceMonitor = true
  newBalanceMonitor(config: RippleBalanceMonitorConfig) {
    return new RippleBalanceMonitor(assertType(RippleBalanceMonitorConfig, config, 'config'))
  }

  connectionManager = new StandardConnectionManager<RippleServerAPI, RippleConnected, BaseRippleConfig>()
}

export default RipplePaymentsFactory
