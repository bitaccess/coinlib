import { HdStellarPaymentsConfig } from './types'
import { generateMnemonic, deriveSignatory } from './bip44'
import { AccountStellarPayments } from './AccountStellarPayments'

export class HdStellarPayments extends AccountStellarPayments {
  readonly seed: string

  constructor({ seed, ...config }: HdStellarPaymentsConfig) {
    super({
      ...config,
      hotAccount: deriveSignatory(seed, 0),
      depositAccount: deriveSignatory(seed, 1)
    })
    this.seed = seed
  }

  static generateMnemonic = generateMnemonic
}
