import { PaymentsFactory, StandardConnectionManager } from '@bitaccess/coinlib-common'
import { assertType } from '@bitaccess/ts-common'

import {
  BitcoinPaymentsConfig,
  HdBitcoinPaymentsConfig,
  UHdBitcoinPaymentsConfig,
  KeyPairBitcoinPaymentsConfig,
  MultisigBitcoinPaymentsConfig,
  BitcoinPaymentsUtilsConfig,
  BaseBitcoinPaymentsConfig,
  BitcoinBalanceMonitorConfig,
  BitcoinBaseConfig,
} from './types'
import { BlockbookServerAPI } from './bitcoinish/types'
import { PACKAGE_NAME } from './constants'
import { BaseBitcoinPayments } from './BaseBitcoinPayments'
import { BitcoinPaymentsUtils } from './BitcoinPaymentsUtils'
import { HdBitcoinPayments } from './HdBitcoinPayments'
import { UHdBitcoinPayments } from './UHdBitcoinPayments'
import { KeyPairBitcoinPayments } from './KeyPairBitcoinPayments'
import { MultisigBitcoinPayments } from './MultisigBitcoinPayments'
import { BitcoinBalanceMonitor } from './BitcoinBalanceMonitor'

export class BitcoinPaymentsFactory extends PaymentsFactory<
  BitcoinPaymentsUtilsConfig,
  BitcoinPaymentsUtils,
  BaseBitcoinPayments<BaseBitcoinPaymentsConfig>,
  BitcoinBalanceMonitor
> {
  readonly packageName = PACKAGE_NAME

  newPayments(config: BitcoinPaymentsConfig) {
    if (HdBitcoinPaymentsConfig.is(config)) {
      return new HdBitcoinPayments(config)
    }
    if (UHdBitcoinPaymentsConfig.is(config)) {
      return new UHdBitcoinPayments(config)
    }
    if (KeyPairBitcoinPaymentsConfig.is(config)) {
      return new KeyPairBitcoinPayments(config)
    }
    if (MultisigBitcoinPaymentsConfig.is(config)) {
      return new MultisigBitcoinPayments(config)
    }
    throw new Error(`Cannot instantiate ${this.packageName} for unsupported config`)
  }

  newUtils(config: BitcoinPaymentsUtilsConfig) {
    return new BitcoinPaymentsUtils(assertType(BitcoinPaymentsUtilsConfig, config, 'config'))
  }

  hasBalanceMonitor = true
  newBalanceMonitor(config: BitcoinBalanceMonitorConfig) {
    return new BitcoinBalanceMonitor(assertType(BitcoinBalanceMonitorConfig, config, 'config'))
  }

  connectionManager = new StandardConnectionManager<BlockbookServerAPI, BitcoinBaseConfig>()
}

export default BitcoinPaymentsFactory
