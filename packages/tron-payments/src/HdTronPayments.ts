import { BaseTronPayments } from './BaseTronPayments'
import Bip44Cache from './Bip44Cache'
import { HdTronPaymentsConfig, GetPayportOptions } from './types'
import { deriveAddress, derivePrivateKey, xprvToXpub, generateNewKeys } from './bip44'
import { Payport } from '@faast/payments-common'
import { isValidXprv, isValidXpub, isValidAddress } from './helpers'

const xpubCache = new Bip44Cache()

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
      ...this.config,
      hdKey: this.getXpub(),
    }
  }

  getAccountId(index: number): string {
    return this.getXpub()
  }

  getAccountIds(): string[] {
    return [this.getXpub()]
  }

  async getPayport(index: number, options: GetPayportOptions = {}): Promise<Payport> {
    const cacheIndex = options.cacheIndex || true
    // this.account is an xprv or xpub
    const xpub = this.getXpub()
    const address = deriveAddress(xpub, index)
    if (!isValidAddress(address)) {
      // This should never happen
      throw new Error(`Cannot get address ${index} - validation failed for derived address`)
    }
    if (cacheIndex) {
      xpubCache.put(xpub, index, address)
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
