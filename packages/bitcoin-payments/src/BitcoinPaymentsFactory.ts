import { PaymentsFactory } from '@faast/payments-common'
import { assertType } from '@faast/ts-common'

import {
  BitcoinPaymentsConfig,
  HdBitcoinPaymentsConfig,
  KeyPairBitcoinPaymentsConfig,
  MultisigBitcoinPaymentsConfig,
  BitcoinPaymentsUtilsConfig,
  BaseBitcoinPaymentsConfig,
} from './types'
import { PACKAGE_NAME } from './constants'
import { BaseBitcoinPayments } from './BaseBitcoinPayments'
import { BitcoinPaymentsUtils } from './BitcoinPaymentsUtils'
import { HdBitcoinPayments } from './HdBitcoinPayments'
import { KeyPairBitcoinPayments } from './KeyPairBitcoinPayments'
import { MultisigBitcoinPayments } from './MultisigBitcoinPayments'

export class BitcoinPaymentsFactory extends PaymentsFactory<
  BitcoinPaymentsUtilsConfig,
  BitcoinPaymentsUtils,
  BaseBitcoinPayments<BaseBitcoinPaymentsConfig>
> {
  readonly packageName = PACKAGE_NAME

  newPayments(config: BitcoinPaymentsConfig) {
    if (HdBitcoinPaymentsConfig.is(config)) {
      return new HdBitcoinPayments(config)
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
    return new BitcoinPaymentsUtils(assertType(BitcoinPaymentsUtilsConfig, config))
  }
}

export default BitcoinPaymentsFactory
