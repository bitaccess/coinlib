import { BaseBitcoinPayments } from './BaseBitcoinPayments'
import { KeyPairBitcoinPaymentsConfig, BitcoinjsKeyPair } from './types'
import { omit } from 'lodash'
import {
  isValidPrivateKey,
  isValidPublicKey,
  privateKeyToKeyPair,
  publicKeyToAddress,
  publicKeyToKeyPair,
  publicKeyToString,
} from './helpers'

export class KeyPairBitcoinPayments extends BaseBitcoinPayments<KeyPairBitcoinPaymentsConfig> {
  readonly publicKeys: { [index: number]: string | undefined } = {}
  readonly privateKeys: { [index: number]: string | null | undefined } = {}
  readonly addresses: { [index: number]: string | undefined } = {}
  readonly addressIndices: { [address: string]: number | undefined } = {}

  constructor(private config: KeyPairBitcoinPaymentsConfig) {
    super(config)

    Object.entries(config.keyPairs).forEach(([key, value]) => {
      if (typeof value === 'undefined' || value === null) {
        return
      }

      const i = Number.parseInt(key)
      let publicKey: string | Buffer
      let privateKey: string | null = null

      if (isValidPublicKey(value, this.bitcoinjsNetwork)) {
        publicKey = value
      } else if (isValidPrivateKey(value, this.bitcoinjsNetwork)) {
        publicKey = privateKeyToKeyPair(value, this.bitcoinjsNetwork).publicKey
        privateKey = value
      } else {
        throw new Error(`KeyPairBitcoinPaymentsConfig.keyPairs[${i}] is not a valid ${this.networkType} private key or address`)
      }

      const address = publicKeyToAddress(publicKey, this.bitcoinjsNetwork, this.addressType)
      if (typeof this.addressIndices[address] === 'number') {
        return
      }

      this.publicKeys[i] = publicKeyToString(publicKey)
      this.privateKeys[i] = privateKey
      this.addresses[i] = address
      this.addressIndices[address] = i
    })
  }

  getFullConfig(): KeyPairBitcoinPaymentsConfig {
    return {
      ...this.config,
      addressType: this.addressType,
    }
  }

  getPublicConfig(): KeyPairBitcoinPaymentsConfig {
    return {
      ...omit(this.getFullConfig(), ['logger', 'server', 'keyPairs']),
      keyPairs: this.addresses,
    }
  }

  getAccountId(index: number): string {
    const accountId = this.addresses[index] || ''
    if (!accountId) {
      throw new Error(`No KeyPairBitcoinPayments account configured at index ${index}`)
    }
    return accountId
  }

  getAccountIds(): string[] {
    return Object.keys(this.addressIndices)
  }

  getKeyPair(index: number): BitcoinjsKeyPair {
    const privateKey = this.privateKeys[index]
    if (privateKey) {
      return privateKeyToKeyPair(privateKey, this.bitcoinjsNetwork)
    }
    const publicKey = this.publicKeys[index] || ''
    if (!this.isValidPublicKey(publicKey)) {
      throw new Error(`Cannot get publicKey ${index} - keyPair[${index}] is undefined or invalid`)
    }
    return publicKeyToKeyPair(publicKey, this.bitcoinjsNetwork)
  }

  getAddress(index: number): string {
    const address = this.addresses[index] || ''
    if (!this.isValidAddress(address)) {
      throw new Error(`Cannot get address ${index} - keyPair[${index}] is undefined or invalid address`)
    }
    return address
  }

  getPrivateKey(index: number): string {
    const privateKey = this.privateKeys[index] || ''
    if (!this.isValidPrivateKey(privateKey)) {
      throw new Error(`Cannot get private key ${index} - keyPair[${index}] is undefined`)
    }
    return privateKey
  }
}

export default KeyPairBitcoinPayments
