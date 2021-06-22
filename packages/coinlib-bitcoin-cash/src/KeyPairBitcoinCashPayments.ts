import { omit } from 'lodash'
import { isUndefined, isString } from '@faast/ts-common'
import { PUBLIC_CONFIG_OMIT_FIELDS } from '@bitaccess/coinlib-bitcoin'

import { SinglesigBitcoinCashPayments } from './SinglesigBitcoinCashPayments'
import { KeyPairBitcoinCashPaymentsConfig, BitcoinjsKeyPair } from './types'
import { DEFAULT_ADDRESS_FORMAT } from './constants';
import {
  privateKeyToKeyPair,
  publicKeyToAddress,
  publicKeyToKeyPair,
  publicKeyToString,
} from './helpers'

export class KeyPairBitcoinCashPayments extends SinglesigBitcoinCashPayments<KeyPairBitcoinCashPaymentsConfig> {
  readonly publicKeys: { [index: number]: string | undefined } = {}
  readonly privateKeys: { [index: number]: string | null | undefined } = {}
  readonly addresses: { [index: number]: string | undefined } = {}

  constructor(private config: KeyPairBitcoinCashPaymentsConfig) {
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
        publicKey = privateKeyToKeyPair(value, this.networkType).publicKey
        privateKey = value
      } else {
        throw new Error(`KeyPairBitcoinCashPaymentsConfig.keyPairs[${i}] is not a valid ${this.networkType} private or public key`)
      }

      const address = publicKeyToAddress(publicKey, this.networkType, this.validAddressFormat ?? DEFAULT_ADDRESS_FORMAT)

      this.publicKeys[i] = publicKeyToString(publicKey)
      this.privateKeys[i] = privateKey
      this.addresses[i] = address
    })
  }

  getFullConfig(): KeyPairBitcoinCashPaymentsConfig {
    return {
      ...this.config,
      network: this.networkType,
    }
  }

  getPublicConfig(): KeyPairBitcoinCashPaymentsConfig {
    return {
      ...omit(this.getFullConfig(), PUBLIC_CONFIG_OMIT_FIELDS),
      keyPairs: this.publicKeys,
    }
  }

  getAccountId(index: number): string {
    const accountId = this.publicKeys[index] || ''
    if (!accountId) {
      throw new Error(`No KeyPairBitcoinCashPayments account configured at index ${index}`)
    }
    return accountId
  }

  getAccountIds(index?: number): string[] {
    if (!isUndefined(index)) {
      return [this.getAccountId(index)]
    }
    return Object.values(this.publicKeys).filter(isString)
  }

  getKeyPair(index: number): BitcoinjsKeyPair {
    const privateKey = this.privateKeys[index]
    if (privateKey) {
      return privateKeyToKeyPair(privateKey, this.networkType)
    }
    const publicKey = this.publicKeys[index] || ''
    if (!this.isValidPublicKey(publicKey)) {
      throw new Error(`Cannot get publicKey ${index} - keyPair[${index}] is undefined or invalid`)
    }
    return publicKeyToKeyPair(publicKey, this.networkType)
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

export default KeyPairBitcoinCashPayments
