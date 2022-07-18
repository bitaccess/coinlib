import { Payport } from '@bitaccess/coinlib-common'
import { omit } from 'lodash'

import { BaseEthereumPayments } from './BaseEthereumPayments'
import { KeyPairEthereumPaymentsConfig } from './types'
import { PUBLIC_CONFIG_OMIT_FIELDS } from './constants'

export class KeyPairEthereumPayments extends BaseEthereumPayments<KeyPairEthereumPaymentsConfig> {
  readonly addresses: { [index: number]: string | undefined } = {}
  readonly privateKeys: { [index: number]: string | undefined } = {}
  readonly addressIndices: { [address: string]: number | undefined } = {}

  private keyPairs: KeyPairEthereumPaymentsConfig['keyPairs']

  constructor(config: KeyPairEthereumPaymentsConfig) {
    super(config)

    this.keyPairs = config.keyPairs
    Object.entries(config.keyPairs).forEach(([key, value]) => {
      if (typeof value === 'undefined' || value === null) {
        return
      }

      const i = Number.parseInt(key)
      let address: string
      let pkey: string | undefined

      if (this.isValidAddress(value)) {
        address = this.standardizeAddressOrThrow(value)
      } else if ( this.isValidPublicKey(value)) {
        address = this.publicKeyToAddress(value)
      } else if (this.isValidPrivateKey(value)) {
        address = this.privateKeyToAddress(value)
        pkey = value
      } else {
        throw new Error(`KeyPairEthereumPaymentsConfig.keyPairs[${i}] is not a valid private key, public key, or address`)
      }

      this.addresses[i] = address
      if (pkey) {
        this.privateKeys[i] = pkey
      }

      const existingIndex = this.addressIndices[address]
      if (typeof existingIndex === 'number') {
        this.logger.debug(`KeyPairEthereumPaymentsConfig.keyPairs[${i}] is a duplicate address of index ${existingIndex}`)
      }
      this.addressIndices[address] = i
    })
  }

  getPublicConfig(): KeyPairEthereumPaymentsConfig {
    return {
      ...omit(this.getFullConfig(), PUBLIC_CONFIG_OMIT_FIELDS),
      keyPairs: this.addresses,
    }
  }

  getAccountId(index: number): string {
    const accountId = this.addresses[index]
    if (!accountId) {
      throw new Error(`Cannot get account ID at ${index} - keyPair[${index}] is ${this.keyPairs[index]}`)
    }
    return accountId
  }

  getAccountIds(): string[] {
    return Object.keys(this.addressIndices)
  }

  async getPayport(index: number): Promise<Payport> {
    const address = this.addresses[index]
    if (!address) {
      throw new Error(`Cannot get payport at ${index} - keyPair[${index}] is ${this.keyPairs[index]}`)
    }
    return { address }
  }

  async getPrivateKey(index: number): Promise<string> {
    const privateKey = this.privateKeys[index]
    if (!privateKey) {
      throw new Error(`Cannot get private key at ${index}`)
    }
    return privateKey
  }
}

export default KeyPairEthereumPayments
