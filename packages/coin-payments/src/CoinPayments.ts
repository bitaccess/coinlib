import * as bip32 from 'bip32'
import { assertType, Logger } from '@faast/ts-common'
import { PaymentsFactory, AnyPayments, NetworkType } from '@faast/payments-common'

import { CoinPaymentsConfig, SupportedCoinPaymentsSymbol, CoinPaymentsAssetConfigs } from './types'
import { keysOf } from './utils'
import { SUPPORTED_ASSET_SYMBOLS, PAYMENTS_FACTORIES } from './constants'

export class CoinPayments {
  readonly payments: { [A in SupportedCoinPaymentsSymbol]?: AnyPayments } = {}
  readonly accountIds: string[]
  readonly network: NetworkType
  readonly logger: Logger

  constructor(public readonly config: CoinPaymentsConfig) {
    assertType(CoinPaymentsConfig, config)
    this.network = config.network || NetworkType.Mainnet
    this.logger = config.logger || console
    const accountIdSet = new Set<string>()
    SUPPORTED_ASSET_SYMBOLS.forEach((assetSymbol) => {
      let assetConfig = config[assetSymbol]
      if (!assetConfig && config.seed) {
        const xprv = bip32.fromSeed(Buffer.from(config.seed, 'hex')).toBase58()
        // TODO: make all payments accept seed so we can omit xprv
        assetConfig = {
          seed: config.seed,
          hdKey: xprv,
        }
      }
      if (!assetConfig) {
        return
      }
      // Clone to avoid mutating external objects
      assetConfig = { ...assetConfig }

      if (config.network) {
        assetConfig.network = config.network
      }
      if (config.logger) {
        assetConfig.logger = config.logger
      }
      const assetPayments = PAYMENTS_FACTORIES[assetSymbol].forConfig(assetConfig)
      this.payments[assetSymbol] = assetPayments
      assetPayments.getAccountIds().forEach((id) => accountIdSet.add(id))
    })
    this.accountIds = Array.from(accountIdSet)
  }

  static getFactory(assetSymbol: SupportedCoinPaymentsSymbol): PaymentsFactory {
    const paymentsFactory = PAYMENTS_FACTORIES[assetSymbol]
    if (!paymentsFactory) {
      throw new Error(`No payment factory configured for asset symbol ${assetSymbol}`)
    }
    return paymentsFactory
  }

  static getPayments<A extends SupportedCoinPaymentsSymbol>(
    assetSymbol: A,
    config: CoinPaymentsAssetConfigs[A],
  ): AnyPayments {
    const factory = CoinPayments.getFactory(assetSymbol)
    return factory.forConfig(config)
  }

  getPublicConfig(): CoinPaymentsConfig {
    return keysOf(this.payments).reduce((o, k) => {
      o[k] = this.forAsset(k).getPublicConfig()
      return o
    }, {} as CoinPaymentsConfig)
  }

  getAccountIds(): string[] {
    return this.accountIds
  }

  forAsset(assetSymbol: SupportedCoinPaymentsSymbol): AnyPayments {
    const assetPayments = this.payments[assetSymbol]
    if (!assetPayments) {
      throw new Error(`No payments interface configured for ${assetSymbol}`)
    }
    return assetPayments
  }

  isAssetSupported(assetSymbol: string): assetSymbol is SupportedCoinPaymentsSymbol {
    return SupportedCoinPaymentsSymbol.is(assetSymbol)
  }

  isAssetConfigured(assetSymbol: SupportedCoinPaymentsSymbol): boolean {
    return Boolean(this.payments[assetSymbol])
  }

}

export default CoinPayments
