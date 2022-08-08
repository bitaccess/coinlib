import { HdStellarPaymentsConfig } from './types'
import { generateMnemonic, deriveSignatory, deriveSignatoryByPath } from './bip44'
import { AccountStellarPayments } from './AccountStellarPayments'

export class HdStellarPayments extends AccountStellarPayments {
  readonly seed: string | null

  constructor({ seed, derivationPath, ...config }: HdStellarPaymentsConfig) {
    let { hotAccount, depositAccount } = config
    if (!hotAccount) {
      hotAccount = derivationPath ? deriveSignatoryByPath(seed, derivationPath, 0) : deriveSignatory(seed, 0)
    }
    if (!depositAccount) {
      depositAccount = derivationPath ? deriveSignatoryByPath(seed, derivationPath, 1) : deriveSignatory(seed, 1)
    }
    super({
      ...config,
      hotAccount,
      depositAccount,
    })
    this.seed = seed?.length > 0 ? seed : null
  }

  static generateMnemonic = generateMnemonic
}
