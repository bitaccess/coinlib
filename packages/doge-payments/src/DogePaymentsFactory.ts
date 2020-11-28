import { PaymentsFactory } from '@faast/payments-common'
import { assertType } from '@faast/ts-common'

import {
  DogePaymentsConfig,
  HdDogePaymentsConfig,
  KeyPairDogePaymentsConfig,
  DogePaymentsUtilsConfig,
  BaseDogePaymentsConfig,
} from './types'
import { PACKAGE_NAME } from './constants'
import { BaseDogePayments } from './BaseDogePayments'
import { DogePaymentsUtils } from './DogePaymentsUtils'
import { HdDogePayments } from './HdDogePayments'
import { KeyPairDogePayments } from './KeyPairDogePayments'

export class DogePaymentsFactory extends PaymentsFactory<
  DogePaymentsUtilsConfig,
  DogePaymentsUtils,
  BaseDogePayments<BaseDogePaymentsConfig>
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
    return new DogePaymentsUtils(assertType(DogePaymentsUtilsConfig, config))
  }
}

export default DogePaymentsFactory
