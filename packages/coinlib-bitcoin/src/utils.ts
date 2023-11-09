import { NetworkType, FeeRateType, AutoFeeLevels, FeeRate, FeeLevel } from '@bitaccess/coinlib-common'
import {
  BitcoinBaseConfig,
 } from './types'
import { BitcoinishPaymentsConfig } from './bitcoinish'
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
  DEFAULT_NETWORK_MIN_RELAY_FEE_RATE,
  DEFAULT_MIN_TX_FEE_RATE,
  DEFAULT_FEE_LEVEL,
  PACKAGE_NAME,
} from './constants'
import { Logger } from '@bitaccess/ts-common'
import request from 'request-promise-native'

const DEFAULT_BITCOINISH_CONFIG = {
  coinSymbol: COIN_SYMBOL,
  coinName: COIN_NAME,
  coinDecimals: DECIMAL_PLACES,
  dustThreshold: DEFAULT_DUST_THRESHOLD,
  networkMinRelayFee: DEFAULT_NETWORK_MIN_RELAY_FEE_RATE,
  minTxFee: {
    feeRate: DEFAULT_MIN_TX_FEE_RATE.toString(),
    feeRateType: FeeRateType.BasePerWeight,
  },
  defaultFeeLevel: DEFAULT_FEE_LEVEL as AutoFeeLevels,
}

export function toBitcoinishConfig<T extends BitcoinBaseConfig>(config: T): BitcoinishPaymentsConfig {
  const configWithDefaults = {
    ...DEFAULT_BITCOINISH_CONFIG,
    ...config,
    network: config.network || DEFAULT_NETWORK,
  }
  const { network, server } = configWithDefaults
  return {
    ...configWithDefaults,
    packageName: PACKAGE_NAME,
    bitcoinjsNetwork: network === NetworkType.Testnet ? NETWORK_TESTNET : NETWORK_MAINNET,
    server:
      config?.api?.nodes ??
      server ??
      (network === NetworkType.Testnet ? DEFAULT_TESTNET_SERVER : DEFAULT_MAINNET_SERVER),
  }
}

const FEE_LEVEL_TO_MEMPOOL_FIELD = {
  [FeeLevel.High]: 'fastestFee',
  [FeeLevel.Medium]: 'economyFee',
  [FeeLevel.Low]: 'minimumFee',
}

export async function getMempoolSpaceMainnetFeeRecommendation(
  feeLevel: AutoFeeLevels,
  logger: Logger,
): Promise<FeeRate> {
  let feeRate: string
  try {
    const body = await request.get(
      process.env.MEMPOOL_SPACE_FEE_URL ?? `https://mempool.space/api/v1/fees/recommended`,
      { json: true },
    )
    const feePerKbField = FEE_LEVEL_TO_MEMPOOL_FIELD[feeLevel]
    const satPerByte = body[feePerKbField]
    if (!satPerByte) {
      throw new Error(`Response is missing expected field ${feePerKbField}`)
    }
    feeRate = String(satPerByte)
    logger.log(`Retrieved BTC mainnet fee rate of ${satPerByte} sat/vbyte from mempool.space for ${feeLevel} level`)
  } catch (e) {
    throw new Error(`Failed to retrieve BTC mainnet fee rate from mempool.space - ${e.toString()}`)
  }
  return {
    feeRate,
    feeRateType: FeeRateType.BasePerWeight,
  }
}
