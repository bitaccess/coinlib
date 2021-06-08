import { omit } from 'lodash'
import {
  assertType,
} from '@faast/ts-common'
import {
  isValidXprv as isValidXprvHelper,
  isValidXpub as isValidXpubHelper,
  validateHdKey,
  xprvToXpub,
  deriveAddress,
  HDNode,
  deriveHDNode,
  deriveKeyPair,
  bip32MagicNumberToPrefix,
} from './bip44'
import { HdBitcoinPaymentsConfig, SinglesigAddressType } from './types'
import { SinglesigBitcoinPayments } from './SinglesigBitcoinPayments'
import { DEFAULT_DERIVATION_PATHS, PUBLIC_CONFIG_OMIT_FIELDS } from './constants'

export class HdBitcoinPayments extends SinglesigBitcoinPayments<HdBitcoinPaymentsConfig> {
  readonly derivationPath: string
  readonly xpub: string
  readonly xprv: string | null
  readonly hdNode: HDNode

  constructor(private config: HdBitcoinPaymentsConfig) {
    super(config)
    assertType(HdBitcoinPaymentsConfig, config)
    this.derivationPath = config.derivationPath || DEFAULT_DERIVATION_PATHS[this.addressType]

    if (this.isValidXpub(config.hdKey)) {
      this.xpub = config.hdKey
      this.xprv = null
    } else if (this.isValidXprv(config.hdKey)) {
      this.xpub = xprvToXpub(config.hdKey, this.derivationPath, this.bitcoinjsNetwork)
      this.xprv = config.hdKey
    } else {
      const providedPrefix = config.hdKey.slice(0, 4)
      const xpubPrefix = bip32MagicNumberToPrefix(this.bitcoinjsNetwork.bip32.public)
      const xprvPrefix = bip32MagicNumberToPrefix(this.bitcoinjsNetwork.bip32.private)
      let reason = ''
      if (providedPrefix !== xpubPrefix && providedPrefix !== xprvPrefix) {
        reason = ` with prefix ${providedPrefix} but expected ${xprvPrefix} or ${xpubPrefix}`
      } else {
        reason = ` (${validateHdKey(config.hdKey, this.bitcoinjsNetwork)})`
      }
      throw new Error(
        `Invalid ${this.networkType} hdKey provided to bitcoin payments config${reason}`
      )
    }
    this.hdNode = deriveHDNode(config.hdKey, this.derivationPath, this.bitcoinjsNetwork)
  }

  isValidXprv(xprv: string) {
    return xprv.startsWith('xprv')
      ? isValidXprvHelper(xprv)
      : isValidXprvHelper(xprv, this.bitcoinjsNetwork)
  }

  isValidXpub(xpub: string) {
    return xpub.startsWith('xpub')
      ? isValidXpubHelper(xpub)
      : isValidXpubHelper(xpub, this.bitcoinjsNetwork)
  }

  getFullConfig(): HdBitcoinPaymentsConfig {
    return {
      ...this.config,
      network: this.networkType,
      addressType: this.addressType,
      derivationPath: this.derivationPath,
    }
  }

  getPublicConfig(): HdBitcoinPaymentsConfig {
    return {
      ...omit(this.getFullConfig(), PUBLIC_CONFIG_OMIT_FIELDS),
      hdKey: this.xpub,
    }
  }
  getAccountId(index: number): string {
    return this.xpub
  }
  getAccountIds(index?: number): string[] {
    return [this.xpub]
  }

  getAddress(index: number, addressType?: SinglesigAddressType): string {
    let hdNode = this.hdNode

    if (addressType && addressType !== this.addressType && this.isValidXprv(this.config.hdKey)) {
      // re-derive HD node
      hdNode = deriveHDNode(
        this.config.hdKey,
        DEFAULT_DERIVATION_PATHS[addressType],
        this.bitcoinjsNetwork
      )
    }

    return deriveAddress(hdNode, index, this.bitcoinjsNetwork, addressType || this.addressType)
  }

  getKeyPair(index: number) {
    return deriveKeyPair(this.hdNode, index, this.bitcoinjsNetwork)
  }
}
