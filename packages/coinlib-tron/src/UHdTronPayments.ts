import { HdTronPayments } from './HdTronPayments'
import { UHdTronPaymentsConfig, SeedPaymentConfig } from './types'
import { determineHdNode } from '@bitaccess/coinlib-common'
import { omit } from 'lodash'
import { UHD_PAYMENTS_CONFIG_OMIT_FIELDS } from './constants'

export class UHdTronPayments extends HdTronPayments {
  readonly seed: string | null

  constructor(config: UHdTronPaymentsConfig) {
    let hdKey: string
    let seed: string | null = null
    if (SeedPaymentConfig.is(config)) {
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

export default UHdTronPayments
