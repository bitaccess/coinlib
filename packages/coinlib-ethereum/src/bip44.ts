import Web3 from 'web3'
import { EthereumSignatory } from './types'
import { pubToAddress } from 'ethereumjs-util'
import { bip32, HDNode } from "@bitaccess/coinlib-common"
import crypto from 'crypto'

import { ec as EC } from 'elliptic'
import { DEFAULT_DERIVATION_PATH } from './constants'
import { buffToHex } from './utils'
const web3 = new Web3()
const ec = new EC('secp256k1')

export class EthereumBIP44 {
  static fromXKey(xkey: string, derivationPath: string = DEFAULT_DERIVATION_PATH) {
    if (['xprv', 'xpub'].includes(xkey.substring(0, 4))) {
        return new EthereumBIP44(bip32.fromBase58(xkey), derivationPath)
    }

    throw new Error('Not a valid xpub or xprv')
  }

  static generateNewKeys(derivationPath: string = DEFAULT_DERIVATION_PATH) {
    return new EthereumBIP44(bip32.fromSeed(crypto.randomBytes(32)), derivationPath)
  }

  private partialPath: string
  private hdNode: HDNode
  public xprv: string
  public xpub: string

  constructor(hdNode: HDNode, derivationPath: string) {
    /** The partial path that remains to be derived on hdNode to reach derivationPath */
    this.partialPath = derivationPath.split('/').slice(hdNode.depth).join('/')
    if (this.partialPath) {
      this.hdNode = hdNode.derivePath(this.partialPath)
    } else {
      this.hdNode = hdNode
    }
    this.xprv = this.getXPrivateKey()
    this.xpub = this.getXPublicKey()
  }

  getAddress(index: number): string {
    const derived = this.deriveByIndex(index)
    const address = buffToHex(pubToAddress(derived.publicKey, true))
    return address
  }

  getPrivateKey(index: number): string {
    const derived = this.deriveByIndex(index)
    if (!derived.privateKey) {
      return ''
    }
    return buffToHex(derived.privateKey)
  }

  getPublicKey(index: number): string {
    return buffToHex(this.deriveByIndex(index).publicKey)
  }

  getXPrivateKey(): string {
    return this.hdNode.isNeutered()
      ? ''
      : this.hdNode.toBase58()
  }

  getXPublicKey() {
    return this.hdNode.neutered().toBase58()
  }

  /** Derives a concrete address index */
  private deriveByIndex(index: number) {
    return this.hdNode.derive(index)
  }

  getSignatory(index: number): EthereumSignatory {
    return {
      address: this.getAddress(index),
      keys: {
        pub: this.getPublicKey(index),
        prv: this.getPrivateKey(index),
      },
      xkeys: {
        xprv: this.getXPrivateKey(),
        xpub: this.getXPublicKey(),
      },
    }
  }
}

export function isValidXkey(key: string): boolean {
  try {
    EthereumBIP44.fromXKey(key)
    return true
  } catch (e) {
    return false
  }
}
