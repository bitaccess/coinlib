import { omit } from 'lodash'
import { isUndefined, isString } from '@faast/ts-common'
import { PUBLIC_CONFIG_OMIT_FIELDS } from '@bitaccess/coinlib-bitcoin'

import { SinglesigLitecoinPayments } from './SinglesigLitecoinPayments'
import { KeyPairLitecoinPaymentsConfig, LitecoinjsKeyPair } from './types'
import {
  privateKeyToKeyPair,
  publicKeyToAddress,
  publicKeyToKeyPair,
  publicKeyToString,
} from './helpers'
import { DEFAULT_ADDRESS_FORMAT } from './constants'

export class KeyPairLitecoinPayments extends SinglesigLitecoinPayments<KeyPairLitecoinPaymentsConfig> {
  readonly publicKeys: { [index: number]: string | undefined } = {}
  readonly privateKeys: { [index: number]: string | null | undefined } = {}
  readonly addresses: { [index: number]: string | undefined } = {}

  constructor(private config: KeyPairLitecoinPaymentsConfig) {
    super(config)

    Object.entries(config.keyPairs).forEach(([key, value]) => {
      if (typeof value === 'undefined' || value === null) {
        return
      }

      const i = Number.parseInt(key)
      let publicKey: string | Buffer
      let privateKey: string | null = null

      if (this.isValidPublicKey(value)) {
        publicKey = value
      } else if (this.isValidPrivateKey(value)) {
        publicKey = privateKeyToKeyPair(value, this.bitcoinjsNetwork).publicKey
        privateKey = value
      } else {
        throw new Error(`KeyPairBitcoinPaymentsConfig.keyPairs[${i}] is not a valid ${this.networkType} private or public key`)
      }

      const address = publicKeyToAddress(
        publicKey,
        this.networkType,
        this.addressType,
        this.validAddressFormat ?? DEFAULT_ADDRESS_FORMAT,
      )

      this.publicKeys[i] = publicKeyToString(publicKey)
      this.privateKeys[i] = privateKey
      this.addresses[i] = address
    })
  }

  getFullConfig(): KeyPairLitecoinPaymentsConfig {
    return {
      ...this.config,
      network: this.networkType,
      addressType: this.addressType,
    }
  }

  getPublicConfig(): KeyPairLitecoinPaymentsConfig {
    return {
      ...omit(this.getFullConfig(), PUBLIC_CONFIG_OMIT_FIELDS),
      keyPairs: this.publicKeys,
    }
  }

  getAccountId(index: number): string {
    const accountId = this.publicKeys[index] || ''
    if (!accountId) {
      throw new Error(`No KeyPairBitcoinPayments account configured at index ${index}`)
    }
    return accountId
  }

  getAccountIds(index?: number): string[] {
    if (!isUndefined(index)) {
      return [this.getAccountId(index)]
    }
    return Object.values(this.publicKeys).filter(isString)
  }

  getKeyPair(index: number): LitecoinjsKeyPair {
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

export default KeyPairLitecoinPayments
