import { HdStellarPaymentsConfig } from './types'
import { generateMnemonic, deriveSignatory, deriveSignatoryByPath } from './bip44'
import { AccountStellarPayments } from './AccountStellarPayments'

export class HdStellarPayments extends AccountStellarPayments {
  readonly seed: string

  constructor({ seed, derivationPath, ...config }: HdStellarPaymentsConfig) {
    super({
      ...config,
      hotAccount: derivationPath? deriveSignatoryByPath(seed, derivationPath, 0) : deriveSignatory(seed, 0),
      depositAccount: derivationPath? deriveSignatoryByPath(seed, derivationPath, 1) : deriveSignatory(seed, 1)
    })
    this.seed = seed
  }

  static generateMnemonic = generateMnemonic
}
