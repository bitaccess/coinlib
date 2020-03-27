import { BaseBitcoinPayments } from './BaseBitcoinPayments'
import { MultisigBitcoinPaymentsConfig, KeyPair } from './types'
import { omit } from 'lodash'
import {
  isValidPrivateKey,
  isValidPublicKey,
  privateKeyToKeyPair,
  publicKeyToAddress,
  publicKeyToKeyPair,
  publicKeyToString,
} from './helpers'

export class MultisigBitcoinPayments extends BaseBitcoinPayments<MultisigBitcoinPaymentsConfig> {

  constructor(private config: MultisigBitcoinPaymentsConfig) {
    super(config)
  }

  getFullConfig(): MultisigBitcoinPaymentsConfig {
    return {
      ...this.config,
      addressType: this.addressType,
    }
  }

  getPublicConfig(): MultisigBitcoinPaymentsConfig {
    return {
      ...omit(this.getFullConfig(), ['logger', 'server', 'keyPairs']),
      signers: this.signers,
    }
  }

  getAccountId(index: number): string {
    const accountId = this.addresses[index] || ''
    if (!accountId) {
      throw new Error(`No MultisigBitcoinPayments account configured at index ${index}`)
    }
    return accountId
  }

  getAccountIds(): string[] {
    return Object.keys(this.addressIndices)
  }

  getKeyPair(index: number): KeyPair {
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

export default MultisigBitcoinPayments
