import { PaymentsFactory } from '@faast/payments-common'
import { assertType } from '@faast/ts-common'

import {
  LitecoinPaymentsConfig,
  HdLitecoinPaymentsConfig,
  KeyPairLitecoinPaymentsConfig,
  LitecoinPaymentsUtilsConfig,
  BaseLitecoinPaymentsConfig,
} from './types'
import { PACKAGE_NAME } from './constants'
import { BaseLitecoinPayments } from './BaseLitecoinPayments'
import { LitecoinPaymentsUtils } from './LitecoinPaymentsUtils'
import { HdLitecoinPayments } from './HdLitecoinPayments'
import { KeyPairLitecoinPayments } from './KeyPairLitecoinPayments'

export class LitecoinPaymentsFactory extends PaymentsFactory<
  LitecoinPaymentsUtilsConfig,
  LitecoinPaymentsUtils,
  BaseLitecoinPayments<BaseLitecoinPaymentsConfig>
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
    return new LitecoinPaymentsUtils(assertType(LitecoinPaymentsUtilsConfig, config))
  }
}

export default LitecoinPaymentsFactory
