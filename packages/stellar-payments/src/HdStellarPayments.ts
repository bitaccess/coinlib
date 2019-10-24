import { HdStellarPaymentsConfig, StellarSignatory } from './types'
import { BaseStellarPayments } from './BaseStellarPayments'
import { generateMnemonic, deriveSignatory } from './bip44'
import { AccountStellarPayments } from './AccountStellarPayments'

export class HdStellarPayments extends AccountStellarPayments {
  readonly seed: string
  readonly hotSignatory: StellarSignatory
  readonly depositSignatory: StellarSignatory

  constructor({ seed, ...config }: HdStellarPaymentsConfig) {
    super({
      ...config,
      hotAccount: deriveSignatory(seed, 0),
      depositAccount: deriveSignatory(seed, 1)
    })
  }

  static generateMnemonic = generateMnemonic
}
