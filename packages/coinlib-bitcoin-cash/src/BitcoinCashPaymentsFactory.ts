import { PaymentsFactory, StandardConnectionManager } from '@bitaccess/coinlib-common'
import { assertType } from '@faast/ts-common'
import { bitcoinish } from '@bitaccess/coinlib-bitcoin'

import {
  BitcoinCashPaymentsConfig,
  HdBitcoinCashPaymentsConfig,
  KeyPairBitcoinCashPaymentsConfig,
  MultisigBitcoinCashPaymentsConfig,
  BitcoinCashPaymentsUtilsConfig,
  BaseBitcoinCashPaymentsConfig,
  BitcoinCashBalanceMonitorConfig,
  BitcoinCashBaseConfig,
} from './types'
import { PACKAGE_NAME } from './constants'
import { BaseBitcoinCashPayments } from './BaseBitcoinCashPayments'
import { BitcoinCashPaymentsUtils } from './BitcoinCashPaymentsUtils'
import { HdBitcoinCashPayments } from './HdBitcoinCashPayments'
import { KeyPairBitcoinCashPayments } from './KeyPairBitcoinCashPayments'
import { MultisigBitcoinCashPayments } from "./MultisigBitcoinCashPayments"
import { BitcoinCashBalanceMonitor } from './BitcoinCashBalanceMonitor'

export class BitcoinCashPaymentsFactory extends PaymentsFactory<
  BitcoinCashPaymentsUtilsConfig,
  BitcoinCashPaymentsUtils,
  BaseBitcoinCashPayments<BaseBitcoinCashPaymentsConfig>,
  BitcoinCashBalanceMonitor
> {
  readonly packageName = PACKAGE_NAME

  newPayments(config: BitcoinCashPaymentsConfig) {
    if (HdBitcoinCashPaymentsConfig.is(config)) {
      return new HdBitcoinCashPayments(config)
    }
    if (KeyPairBitcoinCashPaymentsConfig.is(config)) {
      return new KeyPairBitcoinCashPayments(config)
    }
    if (MultisigBitcoinCashPaymentsConfig.is(config)) {
      return new MultisigBitcoinCashPayments(config)
    }
    throw new Error(`Cannot instantiate ${this.packageName} for unsupported config`)
  }

  newUtils(config: BitcoinCashPaymentsUtilsConfig) {
    return new BitcoinCashPaymentsUtils(assertType(BitcoinCashPaymentsUtilsConfig, config, 'config'))
  }

  hasBalanceMonitor = true
  newBalanceMonitor(config: BitcoinCashBalanceMonitorConfig) {
    return new BitcoinCashBalanceMonitor(assertType(BitcoinCashBalanceMonitorConfig, config, 'config'))
  }

  connectionManager = new StandardConnectionManager<bitcoinish.BlockbookServerAPI, BitcoinCashBaseConfig>()
}

export default BitcoinCashPaymentsFactory
