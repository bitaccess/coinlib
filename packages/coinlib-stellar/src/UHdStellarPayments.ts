import { UHdStellarPaymentsConfig, SeedStellarPaymentsConfig, StellarAccountConfig } from './types'
import { generateMnemonic } from './bip44'
import { isValidAddress } from './helpers'
import { HdStellarPayments } from './HdStellarPayments'

export class UHdStellarPayments extends HdStellarPayments {

  constructor(config: UHdStellarPaymentsConfig) {
    let hotAccount: StellarAccountConfig
    let depositAccount: StellarAccountConfig
    if (SeedStellarPaymentsConfig.is(config)) {
      super(config)
    } else {
      const { uniPubKey, derivationPath, ...restConfig } = config
      const [sendingAddress, receivingAddress] = uniPubKey.split(':')
      if (!isValidAddress(sendingAddress) || !isValidAddress(receivingAddress)) {
        throw new Error(`Invalid stellar uniPubKey ${uniPubKey}`)
      }
      hotAccount = { address: sendingAddress }
      depositAccount = { address: receivingAddress }
      super({
        seed: '',
        ...restConfig,
        hotAccount,
        depositAccount,
      })
    }
  }

  static generateMnemonic = generateMnemonic
}
