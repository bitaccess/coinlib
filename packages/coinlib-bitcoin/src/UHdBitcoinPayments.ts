import { omit } from 'lodash'
import { assertType } from '@bitaccess/ts-common'
import { determineHdNode } from '@bitaccess/coinlib-common'
import { UHdBitcoinPaymentsConfig, SeedBitcoinPaymentsConfig } from './types'
import { HdBitcoinPayments } from './HdBitcoinPayments'
import { UHD_PAYMENTS_CONFIG_OMIT_FIELDS } from './constants'

export class UHdBitcoinPayments extends HdBitcoinPayments {
  readonly seed: string | null

  constructor(config: UHdBitcoinPaymentsConfig) {
    assertType(UHdBitcoinPaymentsConfig, config)
    let hdKey: string
    let seed: string | null = null
    if (SeedBitcoinPaymentsConfig.is(config)) {
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
