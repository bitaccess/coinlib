import { PaymentsFactory, StandardConnectionManager } from '@bitaccess/coinlib-common'
import { assertType } from '@bitaccess/ts-common'

import {
  RipplePaymentsConfig,
  HdRipplePaymentsConfig,
  UHdRipplePaymentsConfig,
  AccountRipplePaymentsConfig,
  BaseRipplePaymentsConfig,
  RippleBalanceMonitorConfig,
  BaseRippleConfig,
  RippleServerAPI,
} from './types'
import { PACKAGE_NAME } from './constants'
import { BaseRipplePayments } from './BaseRipplePayments'
import { HdRipplePayments } from './HdRipplePayments'
import { UHdRipplePayments } from './UHdRipplePayments'
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
  newPayments(config: UHdRipplePaymentsConfig): UHdRipplePayments
  newPayments(config: AccountRipplePaymentsConfig): AccountRipplePayments
  newPayments(config: RipplePaymentsConfig) {
    if (AccountRipplePaymentsConfig.is(config)) {
      return new AccountRipplePayments(config)
    }
    if (HdRipplePaymentsConfig.is(config)) {
      return new HdRipplePayments(config)
    }
    if (UHdRipplePaymentsConfig.is(config)) {
      return new UHdRipplePayments(config)
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

  connectionManager = new StandardConnectionManager<RippleServerAPI, BaseRippleConfig>()
}

export default RipplePaymentsFactory
