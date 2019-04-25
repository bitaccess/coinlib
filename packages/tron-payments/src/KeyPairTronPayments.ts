import { set, get } from 'lodash'

import { BaseTronPayments } from './BaseTronPayments'
import { KeyPairTronPaymentsConfig } from './types'

export class KeyPairTronPayments extends BaseTronPayments {
  addresses: { [index: number]: string | undefined } = {}
  privateKeys: { [index: number]: string | null | undefined } = {}
  addressIndices: { [address: string]: number | undefined } = {}

  constructor(config: KeyPairTronPaymentsConfig) {
    super(config)
    Object.entries(config.keyPairs).forEach(([iString, addressOrKey]) => {
      if (typeof addressOrKey === 'undefined' || addressOrKey === null) {
        return
      }
      const i = Number.parseInt(iString)
      if (this.isValidAddress(addressOrKey)) {
        this.addresses[i] = addressOrKey
        this.privateKeys[i] = null
        this.addressIndices[addressOrKey] = i
        return
      }
      if (this.isValidPrivateKey(addressOrKey)) {
        const address = this.privateKeyToAddress(addressOrKey)
        this.addresses[i] = address
        this.privateKeys[i] = addressOrKey
        this.addressIndices[address] = i
        return
      }
      throw new Error(`keyPairs[${i}] is not a valid private key or address`)
    })
  }

  async getAddress(index: number): Promise<string> {
    const address = this.addresses[index]
    if (typeof address === 'undefined') {
      throw new Error(`Cannot get address ${index} - keyPair[${index}] is undefined`)
    }
    return address
  }

  async getAddressIndex(address: string): Promise<number> {
    const index = this.addressIndices[address]
    if (typeof index === 'undefined') {
      throw new Error(`Cannot get index of address ${address}`)
    }
    return index
  }

  async getPrivateKey(index: number): Promise<string> {
    const privateKey = this.privateKeys[index]
    if (typeof privateKey === 'undefined') {
      throw new Error(`Cannot get private key ${index} - keyPair[${index}] is undefined`)
    }
    if (privateKey === null) {
      throw new Error(`Cannot get private key ${index} - keyPair[${index}] is a public address`)
    }
    return privateKey
  }
}

export default KeyPairTronPayments
