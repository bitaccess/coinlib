import { set, get } from 'lodash'

/**
 * Caches all addresses and indices derived from xpubs. Keeping this a module level variable allows
 * multiple instances of TronPayments using the same xpub to share cached values. We could use a
 * real lru cache here but even if we cached 1,000,000 addresses we'd only use ~150 MB of memory.
 *
 * 2 entries * (34 chars in address * 2 bytes per char + 8 bytes per number) = 152 bytes per address
 * 1000000 addresses * 152 bytes = 152 MB
 */
export class Bip44Cache {
  store: {
    [xpub: string]: {
      addresses: { [index: number]: string }
      indices: { [address: string]: number }
    }
  } = {}

  put(xpub: string, index: number, address: string): void {
    set(this.store, [xpub, 'addresses', index], address)
    set(this.store, [xpub, 'indices', address], index)
  }

  lookupIndex(xpub: string, address: string): number | undefined {
    return get(this.store, [xpub, 'indices', address])
  }

  lookupAddress(xpub: string, index: number): string | undefined {
    return get(this.store, [xpub, 'addresses', index])
  }
}

export default Bip44Cache
