import { assertType, Logger } from '@bitaccess/ts-common'
import { PaymentsFactory, AnyPayments, NetworkType, bip32, bip39, keysOf } from '@bitaccess/coinlib-common'
import crypto from 'crypto'

import {
  CoinPaymentsConfig,
  SupportedCoinPaymentsSymbol,
  paymentsConfigCodecs,
  CoinPaymentsPartialConfigs,
} from './types'
import { SUPPORTED_NETWORK_SYMBOLS, PAYMENTS_FACTORIES } from './constants'

function addSeedIfNecessary(network: SupportedCoinPaymentsSymbol, seed: Buffer, config: any): any {
  const configCodec = paymentsConfigCodecs[network]
  let result = config
  if (configCodec.is(result)) {
    return result
  }
  result = {
    ...config,
    seed: seed.toString('hex'),
  }
  if (configCodec.is(result)) {
    return result
  }
  result = {
    ...config,
    hdKey: bip32.fromSeed(seed).toBase58(),
  }
  if (configCodec.is(result)) {
    return result
  }
  throw new Error(`Invalid config provided for ${network}`)
}

export class CoinPayments {
  readonly payments: { [A in SupportedCoinPaymentsSymbol]?: AnyPayments } = {}
  readonly accountIds: string[]
  readonly network: NetworkType
  readonly logger: Logger
  private readonly seedBuffer?: Buffer

  constructor(public readonly config: CoinPaymentsConfig) {
    assertType(CoinPaymentsConfig, config)
    this.network = config.network || NetworkType.Mainnet
    this.logger = config.logger || console
    this.seedBuffer =
      (config.seed &&
        (config.seed.includes(' ') ? bip39.mnemonicToSeedSync(config.seed) : Buffer.from(config.seed, 'hex'))) ||
      undefined
    const accountIdSet = new Set<string>()
    if (!config.skipInitialInstantiation) {
      SUPPORTED_NETWORK_SYMBOLS.forEach(networkSymbol => {
        const networkConfig = config[networkSymbol]
        if (!networkConfig && !this.seedBuffer) {
          return
        }
        const networkPayments = this.newPayments(networkSymbol, networkConfig)
        this.payments[networkSymbol] = networkPayments
        networkPayments.getAccountIds().forEach(id => accountIdSet.add(id))
      })
    }
    this.accountIds = Array.from(accountIdSet)
  }

  /** Get the global payments factory for a network */
  static getFactory(networkSymbol: SupportedCoinPaymentsSymbol): PaymentsFactory {
    const paymentsFactory = PAYMENTS_FACTORIES[networkSymbol]
    if (!paymentsFactory) {
      throw new Error(`No payment factory configured for network symbol ${networkSymbol}`)
    }
    return paymentsFactory
  }

  private newPayments(networkSymbol: SupportedCoinPaymentsSymbol, partialConfig: any): AnyPayments {
    let paymentsConfig: any = partialConfig
    if (this.seedBuffer) {
      paymentsConfig = addSeedIfNecessary(networkSymbol, this.seedBuffer, paymentsConfig || {})
    }

    // Clone to avoid mutating external objects
    paymentsConfig = { ...paymentsConfig }

    if (this.config.network) {
      paymentsConfig.network = this.config.network
    }
    if (this.config.logger) {
      paymentsConfig.logger = this.config.logger
    }
    assertType(paymentsConfigCodecs[networkSymbol] as any, paymentsConfig, `${networkSymbol} config`)
    return CoinPayments.getFactory(networkSymbol).newPayments(paymentsConfig)
  }

  getPublicConfig(): CoinPaymentsConfig {
    return keysOf(this.payments).reduce((o, k) => {
      const publicConfig = this.forNetwork(k).getPublicConfig()
      // Ensure we don't accidentally expose sensitive fields
      if (publicConfig.seed) {
        delete publicConfig.seed
      }
      if (publicConfig.hdKey && publicConfig.hdKey.startsWith('xprv')) {
        delete publicConfig.hdKey
      }
      o[k] = publicConfig
      return o
    }, {} as any)
  }

  getAccountIds(): string[] {
    return this.accountIds
  }

  forNetwork<T extends SupportedCoinPaymentsSymbol>(
    networkSymbol: T,
    extraConfig?: CoinPaymentsPartialConfigs[T],
  ): AnyPayments {
    const payments = this.payments[networkSymbol]
    if (!payments) {
      throw new Error(`No payments interface configured for network ${networkSymbol}`)
    }

    if (extraConfig) {
      return this.newPayments(networkSymbol, {
        ...payments.getFullConfig(),
        ...extraConfig,
      })
    }
    return payments
  }

  getSpecificPayments<T extends SupportedCoinPaymentsSymbol>(
    networkSymbol: T,
    networkConfig: CoinPaymentsPartialConfigs[T],
  ): AnyPayments {
    return this.newPayments(networkSymbol, networkConfig)
  }

  isNetworkSupported(networkSymbol: string): networkSymbol is SupportedCoinPaymentsSymbol {
    return SupportedCoinPaymentsSymbol.is(networkSymbol)
  }

  isNetworkConfigured(networkSymbol: string): boolean {
    return this.isNetworkSupported(networkSymbol) && Boolean(this.payments[networkSymbol])
  }

  getFingerprint(): string {
    if (!this.seedBuffer) {
      throw new Error('Seed missing from CoinPayments')
    }
    const root = bip32.fromSeed(this.seedBuffer)
    return root.fingerprint.toString('hex')
  }

  getRawSignerId(): string {
    if (!this.seedBuffer) {
      throw new Error('Seed missing from CoinPayments')
    }
    const root = bip32.fromSeed(this.seedBuffer)
    const { publicKey, chainCode } = root.derivePath("m/45'")
    const signerId = crypto
      .createHash('sha256')
      .update(chainCode)
      .update(publicKey)
      .digest('hex')
    return signerId
  }
}

export default CoinPayments
