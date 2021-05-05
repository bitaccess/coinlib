import { PaymentsFactory, StandardConnectionManager } from '@faast/payments-common'
import { assertType } from '@faast/ts-common'
import { bitcoinish } from '@faast/bitcoin-payments'

import {
  DogePaymentsConfig,
  HdDogePaymentsConfig,
  KeyPairDogePaymentsConfig,
  DogePaymentsUtilsConfig,
  BaseDogePaymentsConfig,
  DogeBalanceMonitorConfig,
  DogeBaseConfig,
} from './types'
import { PACKAGE_NAME } from './constants'
import { BaseDogePayments } from './BaseDogePayments'
import { DogePaymentsUtils } from './DogePaymentsUtils'
import { HdDogePayments } from './HdDogePayments'
import { KeyPairDogePayments } from './KeyPairDogePayments'
import { DogeBalanceMonitor } from './DogeBalanceMonitor'

export class DogePaymentsFactory extends PaymentsFactory<
  DogePaymentsUtilsConfig,
  DogePaymentsUtils,
  BaseDogePayments<BaseDogePaymentsConfig>,
  DogeBalanceMonitor
> {
  readonly packageName = PACKAGE_NAME

  newPayments(config: DogePaymentsConfig) {
    if (HdDogePaymentsConfig.is(config)) {
      return new HdDogePayments(config)
    }
    if (KeyPairDogePaymentsConfig.is(config)) {
      return new KeyPairDogePayments(config)
    }
    throw new Error(`Cannot instantiate ${this.packageName} for unsupported config`)
  }

  newUtils(config: DogePaymentsUtilsConfig) {
    return new DogePaymentsUtils(assertType(DogePaymentsUtilsConfig, config, 'config'))
  }

  hasBalanceMonitor = true
  newBalanceMonitor(config: DogeBalanceMonitorConfig) {
    return new DogeBalanceMonitor(assertType(DogeBalanceMonitorConfig, config, 'config'))
  }

  connectionManager = new StandardConnectionManager<bitcoinish.BlockbookServerAPI, DogeBaseConfig>()
}

export default DogePaymentsFactory
