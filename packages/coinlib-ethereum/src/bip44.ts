import { derivationPath } from './../../coinlib-ripple/src/bip44';
import Web3 from 'web3'
import { EthereumSignatory } from './types'
import { pubToAddress } from 'ethereumjs-util'
import { bip32 } from "@bitaccess/coinlib-common"
import crypto from 'crypto'

import { ec as EC } from 'elliptic'
import { DEFAULT_DERIVATION_PATH } from './constants'
const web3 = new Web3()
const ec = new EC('secp256k1')

class EthereumBIP44 {
  static fromExtKey(xkey: string, derivationPath: string = DEFAULT_DERIVATION_PATH) {
    if (['xprv', 'xpub'].includes(xkey.substring(0, 4))) {
        return new EthereumBIP44(bip32.fromBase58(xkey), derivationPath)
    }

    throw new Error('Not extended key')
  }

  private parts: string[]
  key: any
  constructor(hdKey: any, derivationPath: string) {
    this.parts = derivationPath.split('/')

    this.key = hdKey
  }

  getAddress(index?: number): string {
    const derived = this.deriveByIndex(index)
    const address = pubToAddress(derived.publicKey, true)

    return web3.utils.toChecksumAddress(`0x${address.toString('hex')}`).toLowerCase()
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
export function deriveSignatory(xkey?: string, index?: number, derivationPath: string = DEFAULT_DERIVATION_PATH): EthereumSignatory {
  const wallet = xkey ?
    EthereumBIP44.fromExtKey(xkey, derivationPath) :
    EthereumBIP44.fromExtKey(bip32.fromSeed(crypto.randomBytes(32)).toBase58(), derivationPath)

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
