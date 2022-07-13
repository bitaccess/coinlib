import { Payport } from '@bitaccess/coinlib-common'
import { omit } from 'lodash'

import { PUBLIC_CONFIG_OMIT_FIELDS } from '../constants'
import { BaseErc20Payments } from './BaseErc20Payments'
import { deriveSignatory } from '../bip44'
import { deriveCreate2Address } from './utils'
import { HdErc20PaymentsConfig, EthereumSignatory } from '../types'

export class HdErc20Payments extends BaseErc20Payments<HdErc20PaymentsConfig> {
  readonly xprv: string | null
  readonly xpub: string
  readonly derivationPath: string

  constructor(config: HdErc20PaymentsConfig) {
    super(config)
    this.derivationPath = config.derivationPath ?? this.networkConstants.defaultDerivationPath
    try {
      this.xprv = ''
      this.xpub = ''
      if (this.isValidXpub(config.hdKey)) {
        this.xpub = config.hdKey
      } else if (this.isValidXprv(config.hdKey)) {
        this.xprv = config.hdKey
        this.xpub = deriveSignatory(config.hdKey, 0, this.derivationPath).xkeys.xpub
      }

    } catch (e) {
      throw new Error(`Account must be a valid xprv or xpub: ${e.message}`)
    }
  }

  static generateNewKeys(derivationPath?: string): EthereumSignatory {
    return deriveSignatory(undefined, undefined, derivationPath)
  }

  getXpub(): string {
    return this.xpub
  }

  getPublicConfig(): HdErc20PaymentsConfig {
    return {
      ...omit(this.getFullConfig(), PUBLIC_CONFIG_OMIT_FIELDS),
      tokenAddress: this.tokenAddress.toLowerCase(),
      depositKeyIndex: this.depositKeyIndex,
      hdKey: this.getXpub(),
      derivationPath: this.derivationPath,
    }
  }

  getAccountId(index: number): string {
    return this.getXpub()
  }

  getAccountIds(): string[] {
    return [this.getXpub()]
  }

  getAddressSalt(index: number): string {
    const key = deriveSignatory(this.getXpub(), index, this.derivationPath).keys.pub
    const salt = this.web3.utils.sha3(`0x${key}`)
    if (!salt) {
      throw new Error(`Cannot get address salt for index ${index}`)
    }
    return salt
  }

  async getPayport(index: number): Promise<Payport> {
    const signatory = deriveSignatory(this.getXpub(), index, this.derivationPath)
    if (index === 0) {
      return { address: signatory.address }
    }

    if (!this.masterAddress) {
      throw new Error(`Cannot derive payport ${index} - masterAddress is falsy`)
    }
    const address = deriveCreate2Address(this.masterAddress, signatory.keys.pub)

    if (!this.isValidAddress(address)) {
      // This should never happen
      throw new Error(`Cannot get address ${index} - validation failed for derived address`)
    }
    const { address: signerAddress } = deriveSignatory(this.getXpub(), this.depositKeyIndex, this.derivationPath)
    return { address, signerAddress }
  }

  async getPrivateKey(index: number): Promise<string> {
    if (!this.xprv) {
      throw new Error(`Cannot get private key ${index} - HdEthereumPayments was created with an xpub`)
    }

    return deriveSignatory(deriveSignatory(this.xprv, 0, this.derivationPath).xkeys.xprv, index, this.derivationPath).keys.prv
  }
}

export default HdErc20Payments
