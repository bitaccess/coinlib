import { HDPrivateKey } from 'bitcore-lib'

import { BaseTronPayments } from './BaseTronPayments'
import Bip44Cache from './Bip44Cache'
import { GetAddressOptions, HdTronPaymentsConfig } from './types'
import { deriveAddress, derivePrivateKey, xprvToXpub } from './bip44'
import { DEFAULT_MAX_ADDRESS_SCAN } from './constants'
import { isValidXpub, isValidXprv } from './utils'

const xpubCache = new Bip44Cache()

export class HdTronPayments extends BaseTronPayments {
  hdKey: string
  maxAddressScan: number

  constructor(config: HdTronPaymentsConfig) {
    super(config)
    this.hdKey = config.hdKey
    this.maxAddressScan = config.maxAddressScan || DEFAULT_MAX_ADDRESS_SCAN
    if (!(isValidXprv(this.hdKey) || isValidXpub(this.hdKey))) {
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
    return isValidXprv(this.hdKey) ? xprvToXpub(this.hdKey) : this.hdKey
  }

  async getAddress(index: number, options: GetAddressOptions = {}): Promise<string> {
    const cacheIndex = options.cacheIndex || true
    // this.account is an xprv or xpub
    const xpub = this.getXpub()
    const address = deriveAddress(xpub, index)
    if (!this.isValidAddress(address)) {
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
    if (!isValidXprv(this.hdKey)) {
      throw new Error(`Cannot get private key ${index} - account is not a valid xprv)`)
    }
    return derivePrivateKey(this.hdKey, index)
  }
}

export default HdTronPayments
