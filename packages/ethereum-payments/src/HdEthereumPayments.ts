import { BaseEthereumPayments } from './BaseEthereumPayments'
import { HdEthereumPaymentsConfig, EthereumSignatory } from './types'
import { deriveSignatory } from './bip44'
import { Payport } from '@faast/payments-common'
import { omit } from 'lodash'

export class HdEthereumPayments extends BaseEthereumPayments<HdEthereumPaymentsConfig> {
  readonly xprv: string | null
  readonly xpub: string

  constructor(config: HdEthereumPaymentsConfig) {
    super(config)
    try {
      const signatory = deriveSignatory(config.hdKey)
      this.xpub = signatory.xkeys.xpub
      this.xprv = signatory.xkeys.xprv
    } catch (e) {
      throw new Error(`Account must be a valid xprv or xpub: ${e.message}`)
    }
  }

  static generateNewKeys(): EthereumSignatory {
    return deriveSignatory()
  }

  getXpub(): string {
    return this.xpub
  }

  getPublicConfig(): HdEthereumPaymentsConfig {
    return {
      ...omit(this.getFullConfig(), ['hdKey', 'logger', 'fullNode', 'solidityNode', 'eventServer']),
      hdKey: this.getXpub(),
    }
  }

  getAccountId(index: number): string {
    return this.getXpub()
  }

  getAccountIds(): string[] {
    return [this.getXpub()]
  }

  async getPayport(index: number): Promise<Payport> {
    const xpub = this.getXpub()
    const { address } = deriveSignatory(xpub, index)
    if (!await this.isValidAddress(address)) {
      // This should never happen
      throw new Error(`Cannot get address ${index} - validation failed for derived address`)
    }
    return { address }
  }

  async getPrivateKey(index: number): Promise<string> {
    if (!this.xprv) {
      throw new Error(`Cannot get private key ${index} - HdEthereumPayments was created with an xpub`)
    }

    return deriveSignatory(this.xprv, index).keys.prv
  }
}

export default HdEthereumPayments
