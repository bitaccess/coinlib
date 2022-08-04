import { BalanceMonitor, NetworkType, PaymentsFactory } from '@bitaccess/coinlib-common'
import { assertType, Logger } from '@faast/ts-common'
import {
  EthereumBalanceMonitorConfig,
  EthereumPaymentsUtilsConfig,
  EthereumPaymentsConfig,
  HdEthereumPaymentsConfig,
  UHdEthereumPaymentsConfig,
  KeyPairEthereumPaymentsConfig,
  HdErc20PaymentsConfig,
  KeyPairErc20PaymentsConfig,
  UHdErc20PaymentsConfig,
} from './types'
import { PACKAGE_NAME } from './constants'
import { EthereumConnectionManager } from './EthereumConnectionManager'
import { BaseEthereumPayments } from './BaseEthereumPayments'
import { EthereumPaymentsUtils } from './EthereumPaymentsUtils'
import { HdEthereumPayments } from './HdEthereumPayments'
import { UHdEthereumPayments } from './UHdEthereumPayments'
import { KeyPairEthereumPayments } from './KeyPairEthereumPayments'
import { UHdErc20Payments } from './erc20/UHdErc20Payments'
import { HdErc20Payments } from './erc20/HdErc20Payments'
import { KeyPairErc20Payments } from './erc20/KeyPairErc20Payments'
import { EthereumBalanceMonitor } from './EthereumBalanceMonitor'

export class EthereumPaymentsFactory extends PaymentsFactory<
  EthereumPaymentsUtilsConfig,
  EthereumPaymentsUtils,
  BaseEthereumPayments<EthereumPaymentsUtilsConfig>,
  EthereumBalanceMonitor
> {
  readonly packageName = PACKAGE_NAME

  newPayments(config: HdErc20PaymentsConfig): HdErc20Payments
  newPayments(config: UHdErc20PaymentsConfig): UHdErc20Payments
  newPayments(config: KeyPairErc20PaymentsConfig): KeyPairErc20Payments
  newPayments(config: HdEthereumPaymentsConfig): HdEthereumPayments
  newPayments(config: UHdEthereumPaymentsConfig): UHdEthereumPayments
  newPayments(config: KeyPairEthereumPaymentsConfig): KeyPairEthereumPayments

  newPayments(config: EthereumPaymentsConfig) {
    if (HdErc20PaymentsConfig.is(config)) {
      return new HdErc20Payments(config)
    }
    if (UHdErc20PaymentsConfig.is(config)) {
      return new UHdErc20Payments(config)
    }
    if (KeyPairErc20PaymentsConfig.is(config)) {
      throw new Error(`Cannot instantiate ${this.packageName} for unsupported KeyPairErc20PaymentsConfig`)
      // return new KeyPairErc20Payments(config)
    }
    if (HdEthereumPaymentsConfig.is(config)) {
      return new HdEthereumPayments(config)
    }
    if (UHdEthereumPaymentsConfig.is(config)) {
      return new UHdEthereumPayments(config)
    }
    if (KeyPairEthereumPaymentsConfig.is(config)) {
      return new KeyPairEthereumPayments(config)
    }
    throw new Error(`Cannot instantiate ${this.packageName} for unsupported config`)
  }

  newUtils(config: EthereumPaymentsUtilsConfig) {
    return new EthereumPaymentsUtils(assertType(EthereumPaymentsUtilsConfig, config, 'config'))
  }

  hasBalanceMonitor = true

  newBalanceMonitor(config: EthereumBalanceMonitorConfig) {
    return new EthereumBalanceMonitor(assertType(EthereumBalanceMonitorConfig, config, 'config'))
  }

  connectionManager = new EthereumConnectionManager()
}

export default EthereumPaymentsFactory
