import { HdStellarPaymentsConfig, StellarSignatory } from './types'
import { BaseStellarPayments } from './BaseStellarPayments'
import { xprvToXpub, generateNewKeys, deriveSignatory } from './bip44'
import { isValidXprv, isValidXpub } from './helpers'

export class HdStellarPayments extends BaseStellarPayments<HdStellarPaymentsConfig> {
  readonly xprv: string | null
  readonly xpub: string
  readonly hotSignatory: StellarSignatory
  readonly depositSignatory: StellarSignatory

  constructor(config: HdStellarPaymentsConfig) {
    super(config)
    if (isValidXprv(config.hdKey)) {
      this.xprv = config.hdKey
      this.xpub = xprvToXpub(this.xprv)
    } else if (isValidXpub(config.hdKey)) {
      this.xprv = null
      this.xpub = config.hdKey
    } else {
      throw new Error('Account must be a valid xprv or xpub')
    }
    this.hotSignatory = deriveSignatory(config.hdKey, 0)
    this.depositSignatory = deriveSignatory(config.hdKey, 1)
  }

  static generateNewKeys = generateNewKeys

  isReadOnly() {
    return this.xprv === null
  }

  getPublicAccountConfig() {
    return {
      hdKey: xprvToXpub(this.config.hdKey),
    }
  }

  getAccountIds(): string[] {
    return [this.xpub]
  }

  getAccountId(index: number): string {
    return this.xpub
  }

  getHotSignatory() {
    return this.hotSignatory
  }

  getDepositSignatory() {
    return this.depositSignatory
  }
}
