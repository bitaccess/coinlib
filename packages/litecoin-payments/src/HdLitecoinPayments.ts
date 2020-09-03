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
  convertXPrefixHdKeys
} from './bip44'
import { HdLitecoinPaymentsConfig } from './types'
import { SinglesigLitecoinPayments } from './SinglesigLitecoinPayments'
import { DEFAULT_DERIVATION_PATHS } from './constants'
import { bip32MagicNumberToPrefix } from './utils'

export class HdLitecoinPayments extends SinglesigLitecoinPayments<HdLitecoinPaymentsConfig> {
  readonly derivationPath: string
  readonly xpub: string
  readonly xprv: string | null
  readonly hdNode: HDNode

  constructor(private config: HdLitecoinPaymentsConfig) {
    super(config)
    assertType(HdLitecoinPaymentsConfig, config)
    this.derivationPath = config.derivationPath || DEFAULT_DERIVATION_PATHS[this.addressType]

    if (this.isValidXpub(config.hdKey)) {
      this.xpub = config.hdKey
      this.xprv = null
    } else if (this.isValidXprv(config.hdKey)) {
      this.xpub = xprvToXpub(config.hdKey, this.derivationPath, this.bitcoinjsNetwork)
      this.xprv = config.hdKey
    } else {
      const providedPrefix = config.hdKey.slice(0, 4)
      const validPrefixes = Array.from(new Set([
        bip32MagicNumberToPrefix(this.bitcoinjsNetwork.bip32.public),
        bip32MagicNumberToPrefix(this.bitcoinjsNetwork.bip32.private),
        'xprv',
        'xpub'
      ]).keys())
      let reason = ''
      if (!validPrefixes.includes(providedPrefix)) {
        reason = ` with prefix ${providedPrefix} but expected ${validPrefixes.join('|')}`
      } else {
        reason = ` (${validateHdKey(config.hdKey, this.bitcoinjsNetwork)})`
      }
      throw new Error(
        `Invalid ${this.networkType} hdKey provided to litecoin payments config${reason}`
      )
    }
    this.hdNode = deriveHDNode(config.hdKey, this.derivationPath, this.bitcoinjsNetwork)
  }

  isValidXprv(xprv: string) {
    return isValidXprvHelper(convertXPrefixHdKeys(xprv, this.bitcoinjsNetwork), this.bitcoinjsNetwork)
  }

  isValidXpub(xpub: string) {
    return isValidXpubHelper(convertXPrefixHdKeys(xpub, this.bitcoinjsNetwork), this.bitcoinjsNetwork)
  }

  getFullConfig(): HdLitecoinPaymentsConfig {
    return {
      ...this.config,
      network: this.networkType,
      addressType: this.addressType,
      derivationPath: this.derivationPath,
    }
  }

  getPublicConfig(): HdLitecoinPaymentsConfig {
    return {
      ...omit(this.getFullConfig(), ['logger', 'server', 'hdKey', 'blockcypherToken']),
      hdKey: this.xpub,
    }
  }
  getAccountId(index: number): string {
    return this.xpub
  }
  getAccountIds(index?: number): string[] {
    return [this.xpub]
  }

  getAddress(index: number): string {
    return deriveAddress(this.hdNode, index, this.bitcoinjsNetwork, this.addressType)
  }

  getKeyPair(index: number) {
    return deriveKeyPair(this.hdNode, index, this.bitcoinjsNetwork)
  }
}
