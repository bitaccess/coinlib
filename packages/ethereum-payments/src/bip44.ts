import { EthereumSignatory } from './types'
import { pubToAddress } from 'ethereumjs-util'
import { fromBase58, fromSeed, BIP32Interface as HDNode } from 'bip32'
import crypto from 'crypto'

class EthereumBIP44 {
  static fromExtKey(xkey: string) {
    if (['xprv', 'xpub'].includes(xkey.substring(0, 4))) {
        return new EthereumBIP44(fromBase58(xkey))
    }

    throw new Error('Not extended key')
  }

  private parts: string[]
  key: HDNode
  constructor(hdKey: HDNode) {
    this.parts = [
      'm',
      "44'", // bip 44
      "60'",  // coin
      "0'",  // wallet
      '0'    // 0 - public, 1 = private
        // index
    ]

    this.key = hdKey
  }

  getAddress(index?: number): string {
    const derived = this.deriveByIndex(index)
    let address = pubToAddress(derived.publicKey, true)

    return `0x${address.toString('hex')}`
  }

  getPrivateKey(index?: number): string {
    const derived = this.deriveByIndex(index)
    if (!derived.privateKey) {
      return ''
    }
    return `0x${derived.privateKey.toString('hex')}`
  }

  getPublicKey(index?: number): string {
    return this.deriveByIndex(index).publicKey.toString('hex')
  }

  getXPrivateKey(index?: number): string {
    const key = this.deriveByIndex(index).toBase58()

    return key.substring(0, 4) === 'xpub' ? '' : key
  }

  getXPublicKey(index?: number) {
    return this.deriveByIndex(index).neutered().toBase58()
  }

  private deriveByIndex(index?: number) {
    if (typeof index === 'undefined') {
      return this.key
    }
    const path = this.parts.slice(this.key.depth)
    const keyPath = path.length > 0 ? path.join('/') + '/' : ''
    return this.key.derivePath(`${keyPath}${index.toString()}`)
  }
}

// XXX if index is not provided, derived key will be hardened
export function deriveSignatory(xkey?: string, index?: number): EthereumSignatory {
  const wallet = xkey ?
    EthereumBIP44.fromExtKey(xkey) :
    EthereumBIP44.fromExtKey(fromSeed(crypto.randomBytes(32)).toBase58())

  return {
    address: wallet.getAddress(index),
    keys: {
      prv: wallet.getPrivateKey(index) || '',
      pub: wallet.getPublicKey(index),
    },
    xkeys: {
      xprv: wallet.getXPrivateKey(index) || '',
      xpub: wallet.getXPublicKey(index),
    }
  }
}

export function isValidXkey(key: string): boolean {
  try {
    EthereumBIP44.fromExtKey(key)
    return true
  } catch (e) {
    return false
  }
}
