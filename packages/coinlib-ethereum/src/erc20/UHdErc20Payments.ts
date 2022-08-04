import { Payport } from '@bitaccess/coinlib-common'
import { omit } from 'lodash'

import { UHD_PAYMENTS_CONFIG_OMIT_FIELDS } from '../constants'
import { HdErc20Payments } from './HdErc20Payments'
import { EthereumBIP44 } from '../bip44'
import { UHdErc20PaymentsConfig, SeedErc20PaymentsConfig } from '../types'

export class UHdErc20Payments extends HdErc20Payments {
  readonly seed: string | null

  constructor(config: UHdErc20PaymentsConfig) {
    let hdKey: string
    let seed: string | null = null
    if (SeedErc20PaymentsConfig.is(config)) {
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
      tokenAddress: config.tokenAddress,
      ...omit(config, UHD_PAYMENTS_CONFIG_OMIT_FIELDS),
      hdKey,
    })
    this.seed = seed
  }

  
}

export default UHdErc20Payments
