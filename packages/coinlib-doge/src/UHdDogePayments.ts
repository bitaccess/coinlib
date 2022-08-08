import { omit } from 'lodash'
import { assertType } from '@bitaccess/ts-common'
import { UHD_PAYMENTS_CONFIG_OMIT_FIELDS } from '@bitaccess/coinlib-bitcoin'
import { determineHdNode } from '@bitaccess/coinlib-common'
import { HdDogePayments } from './HdDogePayments'
import { SeedDogePaymentsConfig, UHdDogePaymentsConfig } from './types'


export class UHdDogePayments extends HdDogePayments {
  readonly seed: string | null = null

  constructor(config: UHdDogePaymentsConfig) {
    assertType(UHdDogePaymentsConfig, config)
    let hdKey: string
    let seed: string | null = null
    if (SeedDogePaymentsConfig.is(config)) {
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
