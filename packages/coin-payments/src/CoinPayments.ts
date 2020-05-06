import * as bip32 from 'bip32'
import * as bip39 from 'bip39'
import { assertType, Logger } from '@faast/ts-common'
import { PaymentsFactory, AnyPayments, NetworkType } from '@faast/payments-common'
import { NETWORK_TESTNET, NETWORK_MAINNET } from '@faast/bitcoin-payments'

import {
  CoinPaymentsConfig,
  SupportedCoinPaymentsSymbol,
  CoinPaymentsAssetConfigs,
  assetConfigCodecs,
} from './types'
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
    const seedBuffer = config.seed && (config.seed.includes(' ')
      ? bip39.mnemonicToSeedSync(config.seed)
      : Buffer.from(config.seed, 'hex'))
    const accountIdSet = new Set<string>()
    SUPPORTED_ASSET_SYMBOLS.forEach((assetSymbol) => {
      let assetConfig = config[assetSymbol]
      if (seedBuffer) {
        assetConfig = this.addSeedIfNecessary(assetSymbol, seedBuffer, assetConfig || {})
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
      assertType(assetConfigCodecs[assetSymbol] as any, assetConfig, `${assetSymbol} config`)
      const assetPayments = PAYMENTS_FACTORIES[assetSymbol].forConfig(assetConfig)
      this.payments[assetSymbol] = assetPayments
      assetPayments.getAccountIds().forEach((id) => accountIdSet.add(id))
    })
    this.accountIds = Array.from(accountIdSet)
  }

  addSeedIfNecessary(network: SupportedCoinPaymentsSymbol, seed: Buffer, config: object) {
    const configCodec = assetConfigCodecs[network]
    let result = config
    if (configCodec.is(result)) {
      return result
    }
    result = {
      ...config,
      seed: seed.toString('hex')
    }
    if (configCodec.is(result)) {
      return result
    }
    // Okay to use bitcoin network constants here because we only use xprv/tprv
    const bip32Network = this.network === NetworkType.Testnet ? NETWORK_TESTNET : NETWORK_MAINNET
    result = {
      ...config,
      hdKey: bip32.fromSeed(seed, bip32Network).toBase58(),
    }
    if (configCodec.is(result)) {
      return result
    }
    throw new Error(`Invalid config provided for ${network}`)
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
      const publicConfig = this.forAsset(k).getPublicConfig()
      // Ensure we don't accidentally expose sensitive fields
      if (publicConfig.seed) {
        delete publicConfig.seed
      }
      if (publicConfig.hdKey && publicConfig.hdKey.startsWith('xprv')) {
        delete publicConfig.hdKey
      }
      o[k] = publicConfig
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
