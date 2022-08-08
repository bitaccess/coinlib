import { HdEthereumPayments } from './HdEthereumPayments'
import { EthereumBIP44 } from './bip44'
import { UHdEthereumPaymentsConfig, SeedEthereumPaymentsConfig } from './types'
import { omit } from 'lodash'
import { UHD_PAYMENTS_CONFIG_OMIT_FIELDS } from './constants'

export class UHdEthereumPayments extends HdEthereumPayments {
  readonly seed: string | null

  constructor(config: UHdEthereumPaymentsConfig) {
    let hdKey: string
    let seed: string | null = null
    if (SeedEthereumPaymentsConfig.is(config)) {
      seed = config.seed
      const bip44: EthereumBIP44  = EthereumBIP44.fromSeed(seed, config.derivationPath)
      const xprv: string | null = bip44.getXPrivateKey()
      if (!xprv) {
        throw new Error('Cannot derive xprv from given seed')
      }
      hdKey= xprv
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

export default UHdEthereumPayments
