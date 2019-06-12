import { BaseTronPayments } from './BaseTronPayments'
import { KeyPairTronPaymentsConfig } from './types'
import { isValidAddress, isValidPrivateKey, privateKeyToAddress } from './utils'

export class KeyPairTronPayments extends BaseTronPayments<KeyPairTronPaymentsConfig> {
  readonly addresses: { [index: number]: string | undefined } = {}
  readonly privateKeys: { [index: number]: string | null | undefined } = {}
  readonly addressIndices: { [address: string]: number | undefined } = {}

  constructor(private readonly config: KeyPairTronPaymentsConfig) {
    super(config)
    Object.entries(config.keyPairs).forEach(([iString, addressOrKey]) => {
      if (typeof addressOrKey === 'undefined' || addressOrKey === null) {
        return
      }
      const i = Number.parseInt(iString)
      if (isValidAddress(addressOrKey)) {
        this.addresses[i] = addressOrKey
        this.privateKeys[i] = null
        this.addressIndices[addressOrKey] = i
        return
      }
      if (isValidPrivateKey(addressOrKey)) {
        const address = privateKeyToAddress(addressOrKey)
        this.addresses[i] = address
        this.privateKeys[i] = addressOrKey
        this.addressIndices[address] = i
        return
      }
      throw new Error(`KeyPairTronPaymentsConfig.keyPairs[${i}] is not a valid private key or address`)
    })
  }

  getFullConfig(): KeyPairTronPaymentsConfig {
    return this.config
  }

  getPublicConfig(): KeyPairTronPaymentsConfig {
    return {
      ...this.config,
      keyPairs: this.addresses,
    }
  }

  getAccountId(index: number): string {
    const accountId = this.addresses[index]
    if (!accountId) {
      throw new Error(`No KeyPairTronPayments account configured at index ${index}`)
    }
    return accountId
  }

  getAccountIds(): string[] {
    return Object.keys(this.addressIndices)
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
