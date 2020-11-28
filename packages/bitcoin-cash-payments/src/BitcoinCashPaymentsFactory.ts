import { PaymentsFactory } from '@faast/payments-common'
import { assertType } from '@faast/ts-common'

import {
  BitcoinCashPaymentsConfig,
  HdBitcoinCashPaymentsConfig,
  KeyPairBitcoinCashPaymentsConfig,
  BitcoinCashPaymentsUtilsConfig,
  BaseBitcoinCashPaymentsConfig,
} from './types'
import { PACKAGE_NAME } from './constants'
import { BaseBitcoinCashPayments } from './BaseBitcoinCashPayments'
import { BitcoinCashPaymentsUtils } from './BitcoinCashPaymentsUtils'
import { HdBitcoinCashPayments } from './HdBitcoinCashPayments'
import { KeyPairBitcoinCashPayments } from './KeyPairBitcoinCashPayments'

export class BitcoinCashPaymentsFactory extends PaymentsFactory<
  BitcoinCashPaymentsUtilsConfig,
  BitcoinCashPaymentsUtils,
  BaseBitcoinCashPayments<BaseBitcoinCashPaymentsConfig>
> {
  readonly packageName = PACKAGE_NAME

  newPayments(config: BitcoinCashPaymentsConfig) {
    if (HdBitcoinCashPaymentsConfig.is(config)) {
      return new HdBitcoinCashPayments(config)
    }
    if (KeyPairBitcoinCashPaymentsConfig.is(config)) {
      return new KeyPairBitcoinCashPayments(config)
    }
    throw new Error(`Cannot instantiate ${this.packageName} for unsupported config`)
  }

  newUtils(config: BitcoinCashPaymentsUtilsConfig) {
    return new BitcoinCashPaymentsUtils(assertType(BitcoinCashPaymentsUtilsConfig, config))
  }
}

export default BitcoinCashPaymentsFactory
