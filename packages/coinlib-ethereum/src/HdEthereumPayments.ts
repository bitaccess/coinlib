import { BaseEthereumPayments } from './BaseEthereumPayments'
import { HdEthereumPaymentsConfig, EthereumSignatory } from './types'
import { EthereumBIP44 } from './bip44'
import { Payport } from '@bitaccess/coinlib-common'
import { omit } from 'lodash'
import { PUBLIC_CONFIG_OMIT_FIELDS } from './constants'

export class HdEthereumPayments extends BaseEthereumPayments<HdEthereumPaymentsConfig> {
  readonly xprv: string | null
  readonly xpub: string
  readonly derivationPath: string
  private readonly bip44: EthereumBIP44

  constructor(config: HdEthereumPaymentsConfig) {
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

  getPublicConfig(): HdEthereumPaymentsConfig {
    return {
      ...omit(this.getFullConfig(), PUBLIC_CONFIG_OMIT_FIELDS),
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

  async getPayport(index: number): Promise<Payport> {
    const address = this.bip44.getAddress(index)
    if (!this.isValidAddress(address)) {
      // This should never happen
      throw new Error(`Cannot get address ${index} - validation failed for derived address`)
    }
    return { address: this.standardizeAddressOrThrow(address) }
  }

  async getPrivateKey(index: number): Promise<string> {
    if (!this.xprv) {
      throw new Error(`Cannot get private key ${index} - HdEthereumPayments was created with an xpub`)
    }

    const privateKey = this.bip44.getPrivateKey(index)
    if (!privateKey) {
      throw new Error(`Failed to derive private key ${index}`)
    }
    return privateKey
  }
}

export default HdEthereumPayments
