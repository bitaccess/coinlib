import { BaseTronPayments } from './BaseTronPayments'
import { HdTronPaymentsConfig } from './types'
import { deriveAddress, derivePrivateKey, xprvToXpub, generateNewKeys } from './bip44'
import { Payport } from '@bitaccess/coinlib-common'
import { isValidXprv, isValidXpub, isValidAddress } from './helpers'
import { omit } from 'lodash'
import { PUBLIC_CONFIG_OMIT_FIELDS } from './constants'

export class HdTronPayments extends BaseTronPayments<HdTronPaymentsConfig> {
  readonly xprv: string | null
  readonly xpub: string

  constructor(private readonly config: HdTronPaymentsConfig) {
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
  }

  static generateNewKeys = generateNewKeys

  getXpub(): string {
    return this.xpub
  }

  getFullConfig(): HdTronPaymentsConfig {
    return this.config
  }

  getPublicConfig(): HdTronPaymentsConfig {
    return {
      ...omit(this.config, PUBLIC_CONFIG_OMIT_FIELDS),
      hdKey: this.getXpub(),
    }
  }

  getAccountId(index: number): string {
    return this.getXpub()
  }

  getAccountIds(): string[] {
    return [this.getXpub()]
  }

  async getPayport(index: number): Promise<Payport> {
    const xpub = this.getXpub()
    const address = deriveAddress(xpub, index)
    if (!isValidAddress(address)) {
      // This should never happen
      throw new Error(`Cannot get address ${index} - validation failed for derived address`)
    }
    return { address }
  }

  async getPrivateKey(index: number): Promise<string> {
    if (!this.xprv) {
      throw new Error(`Cannot get private key ${index} - HdTronPayments was created with an xpub`)
    }
    return derivePrivateKey(this.xprv, index)
  }
}

export default HdTronPayments
