import { omit } from 'lodash'
import { assertType } from '@bitaccess/ts-common'
import { UHD_PAYMENTS_CONFIG_OMIT_FIELDS } from '@bitaccess/coinlib-bitcoin'
import { determineHdNode } from '@bitaccess/coinlib-common'

import {
  SeedBitcoinCashPaymentsConfig,
  UHdBitcoinCashPaymentsConfig,
} from './types'
import { HdBitcoinCashPayments } from './HdBitcoinCashPayments'

export class UHdBitcoinCashPayments extends HdBitcoinCashPayments {
  readonly seed: string | null
  constructor(config: UHdBitcoinCashPaymentsConfig) {
    assertType(UHdBitcoinCashPaymentsConfig, config)
    let hdKey: string
    let seed: string | null = null
    if (SeedBitcoinCashPaymentsConfig.is(config)) {
      seed = config.seed
      const rootNode = determineHdNode(seed)
      hdKey = rootNode.toBase58()
    } else {
      hdKey = config.uniPubKey
    }
    super({
      ...omit(config, UHD_PAYMENTS_CONFIG_OMIT_FIELDS),
      hdKey,
    })
    this.seed = seed
  }

}
