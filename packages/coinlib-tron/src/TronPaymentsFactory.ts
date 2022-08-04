import { PaymentsFactory } from '@bitaccess/coinlib-common'
import { assertType } from '@faast/ts-common'

import { TronPaymentsConfig, HdTronPaymentsConfig,UHdTronPaymentsConfig, KeyPairTronPaymentsConfig, BaseTronPaymentsConfig } from './types'
import { PACKAGE_NAME } from './constants'
import { BaseTronPayments } from './BaseTronPayments'
import { HdTronPayments } from './HdTronPayments'
import { UHdTronPayments } from './UHdTronPayments'
import { KeyPairTronPayments } from './KeyPairTronPayments'
import { TronPaymentsUtils } from './TronPaymentsUtils'

export class TronPaymentsFactory extends PaymentsFactory<
  BaseTronPaymentsConfig,
  TronPaymentsUtils,
  BaseTronPayments<BaseTronPaymentsConfig>
> {
  readonly packageName = PACKAGE_NAME

  newPayments(config: HdTronPaymentsConfig): HdTronPayments
  newPayments(config: UHdTronPaymentsConfig): UHdTronPayments
  newPayments(config: KeyPairTronPaymentsConfig): KeyPairTronPayments
  newPayments(config: TronPaymentsConfig) {
    if (HdTronPaymentsConfig.is(config)) {
      return new HdTronPayments(config)
    }
    if (UHdTronPaymentsConfig.is(config)) {
      return new UHdTronPayments(config)
    }
    if (KeyPairTronPaymentsConfig.is(config)) {
      return new KeyPairTronPayments(config)
    }
    throw new Error(`Cannot instantiate ${this.packageName} for unsupported config`)
  }

  newUtils(config: BaseTronPaymentsConfig): TronPaymentsUtils {
    return new TronPaymentsUtils(assertType(BaseTronPaymentsConfig, config, 'config'))
  }
}

export default TronPaymentsFactory
