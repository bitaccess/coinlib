import { HdEthereumPayments } from '..'
import { BaseErc20Payments } from './BaseErc20Payments'
import { applyMixins } from './mixins'

import { deriveSignatory } from '../bip44'
import { Payport } from '@faast/payments-common'
import { omit } from 'lodash'
import { HdErc20PaymentsConfig, EthereumSignatory } from '../types'

//interface HdErc20Payments extends BaseErc20Payments<HdErc20PaymentsConfig>, HdEthereumPayments {}
export class HdErc20Payments extends BaseErc20Payments<HdErc20PaymentsConfig> {//HdEthereumPayments {
  readonly xprv: string | null
  readonly xpub: string

  constructor(config: HdErc20PaymentsConfig) {
    super(config)
    try {
      this.xprv = ''
      this.xpub = ''
      if (this.isValidXpub(config.hdKey)) {
        this.xpub = config.hdKey
      } else if (this.isValidXprv(config.hdKey)) {
        this.xprv = config.hdKey
        this.xpub = deriveSignatory(config.hdKey, 0).xkeys.xpub
      }

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

  getPublicConfig(): HdErc20PaymentsConfig {
    return {
      ...omit(this.getFullConfig(), ['hdKey', 'logger', 'fullNode', 'solidityNode', 'eventServer']),
      tokenAddress: this.tokenAddress,
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
    const { address } = deriveSignatory(this.getXpub(), index)
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

    return deriveSignatory(deriveSignatory(this.xprv, 0).xkeys.xprv, index).keys.prv
  }

}
//applyMixins(HdErc20Payments, [HdEthereumPayments, BaseErc20Payments]);

export default HdErc20Payments
