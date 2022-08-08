import { PaymentsFactory, StandardConnectionManager } from '@bitaccess/coinlib-common'
import { assertType } from '@bitaccess/ts-common'
import { bitcoinish } from '@bitaccess/coinlib-bitcoin'

import {
  DogePaymentsConfig,
  HdDogePaymentsConfig,
  KeyPairDogePaymentsConfig,
  MultisigDogePaymentsConfig,
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
import { MultisigDogePayments } from './MultisigDogePayments'
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
    if (MultisigDogePaymentsConfig.is(config)) {
      return new MultisigDogePayments(config)
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
