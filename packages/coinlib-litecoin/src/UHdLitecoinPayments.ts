import { omit } from 'lodash'
import { assertType } from '@faast/ts-common'
import { UHD_PAYMENTS_CONFIG_OMIT_FIELDS } from '@bitaccess/coinlib-bitcoin'
import { determineHdNode } from '@bitaccess/coinlib-common'
import { UHdLitecoinPaymentsConfig, SeedLitecoinPaymentsConfig } from './types'
import { HdLitecoinPayments } from './HdLitecoinPayments'

export class UHdLitecoinPayments extends HdLitecoinPayments {
  readonly seed: string | null

  constructor(config: UHdLitecoinPaymentsConfig) {
    assertType(UHdLitecoinPaymentsConfig, config)
    let hdKey: string
    let seed: string | null = null
    if (SeedLitecoinPaymentsConfig.is(config)) {
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
