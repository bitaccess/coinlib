import { Payport } from '@faast/payments-common'
import { omit } from 'lodash'

import { BaseEthereumPayments } from './BaseEthereumPayments'
import { KeyPairEthereumPaymentsConfig } from './types'
import { deriveSignatory } from './bip44'
import { PUBLIC_CONFIG_OMIT_FIELDS } from './constants'

export class KeyPairEthereumPayments extends BaseEthereumPayments<KeyPairEthereumPaymentsConfig> {
  readonly addresses: { [index: number]: string | undefined } = {}
  readonly privateKeys: { [index: number]: string | null | undefined } = {}
  readonly addressIndices: { [address: string]: number | undefined } = {}

  constructor(config: KeyPairEthereumPaymentsConfig) {
    super(config)

    Object.entries(config.keyPairs).forEach(([key, value]) => {
      if (typeof value === 'undefined' || value === null) {
        return
      }

      const i = Number.parseInt(key)
      let address: string
      let pkey: string | null = null

      if (this.web3.utils.isAddress(value)) {
        address = value.toLowerCase()
      } else if (this.isValidPrivateKey(value)) {
        address = this.privateKeyToAddress(value)
      } else if (this.isValidXprv(value)) {
        // XXX hardened
        const signatory = deriveSignatory(value)
        address = signatory.address
        pkey = signatory.keys.prv
      } else {
        throw new Error(`KeyPairEthereumPaymentsConfig.keyPairs[${i}] is not a valid private key or address`)
      }

      if(typeof this.addressIndices[address] === 'number') {
        return
      }

      this.addresses[i] = address
      this.privateKeys[i] = pkey
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
    const accountId = this.addresses[index] || ''
    if (!accountId) {
      throw new Error(`No KeyPairEthereumPayments account configured at index ${index}`)
    }
    return accountId
  }

  getAccountIds(): string[] {
    return Object.keys(this.addressIndices)
  }

  async getPayport(index: number): Promise<Payport> {
    const address = this.addresses[index] || ''
    if (!await this.isValidAddress(address)) {
      throw new Error(`Cannot get address ${index} - keyPair[${index}] is undefined or invalid address`)
    }
    return { address }
  }

  async getPrivateKey(index: number): Promise<string> {
    const privateKey = this.privateKeys[index] || ''
    if (!this.isValidPrivateKey(privateKey)) {
      throw new Error(`Cannot get private key ${index} - keyPair[${index}] is undefined`)
    }
    return privateKey
  }
}

export default KeyPairEthereumPayments
