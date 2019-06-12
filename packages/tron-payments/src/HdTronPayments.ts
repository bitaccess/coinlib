import { HDPrivateKey } from 'bitcore-lib'

import { BaseTronPayments } from './BaseTronPayments'
import Bip44Cache from './Bip44Cache'
import { GetAddressOptions, HdTronPaymentsConfig } from './types'
import { deriveAddress, derivePrivateKey, xprvToXpub } from './bip44'
import { DEFAULT_MAX_ADDRESS_SCAN } from './constants'
import { isValidXpub, isValidXprv, isValidAddress } from './utils'

const xpubCache = new Bip44Cache()

export class HdTronPayments extends BaseTronPayments<HdTronPaymentsConfig> {
  readonly xprv: string | null
  readonly xpub: string
  maxAddressScan: number

  constructor(private readonly config: HdTronPaymentsConfig) {
    super(config)
    this.maxAddressScan = config.maxAddressScan || DEFAULT_MAX_ADDRESS_SCAN
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

  static generateNewKeys() {
    const key = new HDPrivateKey()
    const xprv = key.toString()
    const xpub = xprvToXpub(xprv)
    return {
      xprv,
      xpub,
    }
  }

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

  async getAddress(index: number, options: GetAddressOptions = {}): Promise<string> {
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
    return address
  }

  async getAddressIndex(address: string): Promise<number> {
    const xpub = this.getXpub()
    const cachedIndex = xpubCache.lookupIndex(xpub, address)
    if (cachedIndex) {
      return cachedIndex
    }
    for (let i = 0; i < this.maxAddressScan; i++) {
      if (address === deriveAddress(xpub, i)) {
        xpubCache.put(xpub, i, address)
        return i
      }
    }
    throw new Error(
      'Cannot get index of address after checking cache and scanning addresses' +
        ` from 0 to ${this.maxAddressScan - 1} (address=${address})`,
    )
  }

  async getPrivateKey(index: number): Promise<string> {
    if (!this.xprv) {
      throw new Error(`Cannot get private key ${index} - HdTronPayments was created with an xpub`)
    }
    return derivePrivateKey(this.xprv, index)
  }
}

export default HdTronPayments
