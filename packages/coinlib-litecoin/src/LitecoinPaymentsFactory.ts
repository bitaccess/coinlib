import { PaymentsFactory, StandardConnectionManager } from '@bitaccess/coinlib-common'
import { assertType } from '@faast/ts-common'
import { bitcoinish } from '@bitaccess/coinlib-bitcoin'

import {
  LitecoinPaymentsConfig,
  HdLitecoinPaymentsConfig,
  KeyPairLitecoinPaymentsConfig,
  LitecoinPaymentsUtilsConfig,
  BaseLitecoinPaymentsConfig,
  LitecoinBalanceMonitorConfig,
  LitecoinBaseConfig,
} from './types'
import { PACKAGE_NAME } from './constants'
import { BaseLitecoinPayments } from './BaseLitecoinPayments'
import { LitecoinPaymentsUtils } from './LitecoinPaymentsUtils'
import { HdLitecoinPayments } from './HdLitecoinPayments'
import { KeyPairLitecoinPayments } from './KeyPairLitecoinPayments'
import { LitecoinBalanceMonitor } from './LitecoinBalanceMonitor'

export class LitecoinPaymentsFactory extends PaymentsFactory<
  LitecoinPaymentsUtilsConfig,
  LitecoinPaymentsUtils,
  BaseLitecoinPayments<BaseLitecoinPaymentsConfig>,
  LitecoinBalanceMonitor
> {
  readonly packageName = PACKAGE_NAME

  newPayments(config: LitecoinPaymentsConfig) {
    if (HdLitecoinPaymentsConfig.is(config)) {
      return new HdLitecoinPayments(config)
    }
    if (KeyPairLitecoinPaymentsConfig.is(config)) {
      return new KeyPairLitecoinPayments(config)
    }
    throw new Error(`Cannot instantiate ${this.packageName} for unsupported config`)
  }

  newUtils(config: LitecoinPaymentsUtilsConfig) {
    return new LitecoinPaymentsUtils(assertType(LitecoinPaymentsUtilsConfig, config, 'config'))
  }

  hasBalanceMonitor = true
  newBalanceMonitor(config: LitecoinBalanceMonitorConfig) {
    return new LitecoinBalanceMonitor(assertType(LitecoinBalanceMonitorConfig, config, 'config'))
  }

  connectionManager = new StandardConnectionManager<bitcoinish.BlockbookServerAPI, LitecoinBaseConfig>()
}

export default LitecoinPaymentsFactory
