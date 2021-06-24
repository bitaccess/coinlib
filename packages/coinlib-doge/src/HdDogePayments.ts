import { omit } from 'lodash'
import {
  assertType,
} from '@faast/ts-common'
import { PUBLIC_CONFIG_OMIT_FIELDS, bitcoinish } from '@bitaccess/coinlib-bitcoin'

import {
  isValidXprv as isValidXprvHelper,
  isValidXpub as isValidXpubHelper,
  validateHdKey,
  xprvToXpub,
  deriveAddress,
  HDNode,
  deriveHDNode,
  deriveKeyPair,
} from './bip44'
import { HdDogePaymentsConfig } from './types'
import { SinglesigDogePayments } from './SinglesigDogePayments'
import { DEFAULT_DERIVATION_PATH } from './constants'

export class HdDogePayments extends SinglesigDogePayments<HdDogePaymentsConfig> {
  readonly derivationPath: string
  readonly xpub: string
  readonly xprv: string | null
  readonly hdNode: HDNode

  constructor(private config: HdDogePaymentsConfig) {
    super(config)
    assertType(HdDogePaymentsConfig, config)
    this.derivationPath = config.derivationPath || DEFAULT_DERIVATION_PATH

    if (this.isValidXpub(config.hdKey)) {
      this.xpub = config.hdKey
      this.xprv = null
    } else if (this.isValidXprv(config.hdKey)) {
      this.xpub = xprvToXpub(config.hdKey, this.derivationPath, this.bitcoinjsNetwork)
      this.xprv = config.hdKey
    } else {
      const providedPrefix = config.hdKey.slice(0, 4)
      const xpubPrefix = bitcoinish.bip32MagicNumberToPrefix(this.bitcoinjsNetwork.bip32.public)
      const xprvPrefix = bitcoinish.bip32MagicNumberToPrefix(this.bitcoinjsNetwork.bip32.private)
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

  getFullConfig(): HdDogePaymentsConfig {
    return {
      ...this.config,
      network: this.networkType,
      derivationPath: this.derivationPath,
    }
  }

  getPublicConfig(): HdDogePaymentsConfig {
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

  getAddress(index: number): string {
    return deriveAddress(this.hdNode, index, this.bitcoinjsNetwork)
  }

  getKeyPair(index: number) {
    return deriveKeyPair(this.hdNode, index, this.bitcoinjsNetwork)
  }
}
