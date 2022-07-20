import { Payport } from '@bitaccess/coinlib-common'
import { omit } from 'lodash'

import { PUBLIC_CONFIG_OMIT_FIELDS } from '../constants'
import { BaseErc20Payments } from './BaseErc20Payments'
import { EthereumBIP44 } from '../bip44'
import { deriveCreate2Address } from './utils'
import { HdErc20PaymentsConfig, EthereumSignatory } from '../types'
import { prepend0x } from '../utils'

export class HdErc20Payments extends BaseErc20Payments<HdErc20PaymentsConfig> {
  readonly xprv: string | null
  readonly xpub: string
  readonly derivationPath: string
  private readonly bip44: EthereumBIP44

  constructor(config: HdErc20PaymentsConfig) {
    super(config)
    this.derivationPath = config.derivationPath ?? this.networkConstants.defaultDerivationPath
    this.bip44 = EthereumBIP44.fromXKey(config.hdKey, this.derivationPath)
    this.xprv = this.bip44.getXPrivateKey()
    this.xpub = this.bip44.getXPublicKey()
  }

  static generateNewKeys(derivationPath?: string): EthereumSignatory {
    return EthereumBIP44.generateNewKeys(derivationPath).getSignatory(0)
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

  getAccountId(): string {
    return this.getXpub()
  }

  getAccountIds(): string[] {
    return [this.getXpub()]
  }

  getAddressSalt(index: number): string {
    const pubKey = this.bip44.getPublicKey(index)
    const salt = this.web3.utils.sha3(prepend0x(pubKey))
    if (!salt) {
      throw new Error(`Cannot get address salt for index ${index}`)
    }
    return salt
  }

  deriveStandardAddress(index: number) {
    return this.standardizeAddressOrThrow(this.bip44.getAddress(index))
  }

  async getPayport(index: number): Promise<Payport> {
    if (index === 0) {
      return { address: this.deriveStandardAddress(index) }
    }

    if (!this.masterAddress) {
      throw new Error(`Cannot derive payport ${index} - masterAddress is falsy`)
    }
    const pubKey = this.bip44.getPublicKey(this.depositKeyIndex)
    const address = deriveCreate2Address(this.masterAddress, pubKey)

    if (!this.isValidAddress(address)) {
      // This should never happen
      throw new Error(`Cannot get address ${index} - validation failed for derived address`)
    }
    const signerAddress = this.deriveStandardAddress(this.depositKeyIndex)
    return { address, signerAddress }
  }

  async getPrivateKey(index: number): Promise<string> {
    if (!this.xprv) {
      throw new Error(`Cannot get private key ${index} - ${this.constructor.name} was created with an xpub`)
    }

    const privateKey = this.bip44.getPrivateKey(this.depositKeyIndex)
    if (!privateKey) {
      throw new Error(`Cannot get private key ${index} - private key at depositKeyIndex ${this.depositKeyIndex} failed to derive`)
    }
    return privateKey
  }
}

export default HdErc20Payments
