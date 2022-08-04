import { UHdStellarPaymentsConfig, SeedStellarPaymentsConfig, StellarAccountConfig } from './types'
import { generateMnemonic, deriveSignatory, deriveSignatoryByPath } from './bip44'
import { HdStellarPayments } from './HdStellarPayments'
import { StrKey } from 'stellar-sdk'

export class UHdStellarPayments extends HdStellarPayments {

  constructor(config: UHdStellarPaymentsConfig) {
    let hotAccount: StellarAccountConfig
    let depositAccount: StellarAccountConfig
    if (SeedStellarPaymentsConfig.is(config)) {
      super(config)
    } else {
      const { uniPubKey, derivationPath, ...restConfig } = config
      const [sendingAddress, receivingAddress] = uniPubKey.split(':')
      if (!StrKey.isValidEd25519PublicKey(sendingAddress) || !StrKey.isValidEd25519PublicKey(receivingAddress)) {
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
