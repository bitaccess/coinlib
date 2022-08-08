import { omit } from 'lodash'
import { UHdRipplePaymentsConfig, SeedRipplePaymentsConfig, RippleSignatory } from './types'
import { determineHdNode } from '@bitaccess/coinlib-common'
import { HdRipplePayments } from './HdRipplePayments'
import { UHD_PAYMENTS_CONFIG_OMIT_FIELDS } from './constants'

export class UHdRipplePayments extends HdRipplePayments {
  readonly seed: string | null

  constructor(config: UHdRipplePaymentsConfig) {
    let hdKey: string
    let seed: string | null = null
    if (SeedRipplePaymentsConfig.is(config)) {
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
