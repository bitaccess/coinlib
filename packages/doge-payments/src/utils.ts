import { NetworkType, FeeRateType, AutoFeeLevels } from '@faast/payments-common'
import { DogeBaseConfig } from './types'
import { bitcoinish } from '@faast/bitcoin-payments'
import {
  DEFAULT_NETWORK,
  NETWORK_TESTNET,
  NETWORK_MAINNET,
  DEFAULT_TESTNET_SERVER,
  DEFAULT_MAINNET_SERVER,
  COIN_SYMBOL,
  COIN_NAME,
  DECIMAL_PLACES,
  DEFAULT_DUST_THRESHOLD,
  DEFAULT_NETWORK_MIN_RELAY_FEE,
  DEFAULT_MIN_TX_FEE,
  DEFAULT_FEE_LEVEL,
} from './constants'

const DEFAULT_BITCOINISH_CONFIG = {
  coinSymbol: COIN_SYMBOL,
  coinName: COIN_NAME,
  coinDecimals: DECIMAL_PLACES,
  dustThreshold: DEFAULT_DUST_THRESHOLD,
  networkMinRelayFee: DEFAULT_NETWORK_MIN_RELAY_FEE,
  minTxFee: {
    feeRate: DEFAULT_MIN_TX_FEE.toString(),
    feeRateType: FeeRateType.BasePerWeight,
  },
  defaultFeeLevel: DEFAULT_FEE_LEVEL as AutoFeeLevels,
}

export function toBitcoinishConfig<T extends DogeBaseConfig>(config: T): bitcoinish.BitcoinishPaymentsConfig {
  const configWithDefaults = {
    ...DEFAULT_BITCOINISH_CONFIG,
    ...config,
    network: config.network || DEFAULT_NETWORK,
  }
  const { network, server } = configWithDefaults
  return {
    ...configWithDefaults,
    bitcoinjsNetwork: network === NetworkType.Testnet ? NETWORK_TESTNET : NETWORK_MAINNET,
    server: config?.api?.nodes ?? server ?? (network === NetworkType.Testnet
      ? DEFAULT_TESTNET_SERVER
      : DEFAULT_MAINNET_SERVER)
  }
}
