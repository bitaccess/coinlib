import { NetworkType, FeeRateType, AutoFeeLevels, FeeRate, FeeLevel, NetworkTypeT } from '@bitaccess/coinlib-common'
import { BitcoinBaseConfig } from './types'
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
  networkType: NetworkType,
): Promise<FeeRate> {
  let feeRate: string
  let url: string
  const MEMPOOL_SPACE_FEE_URL_MAINNET =
    process.env.MEMPOOL_SPACE_FEE_URL_MAINNET ?? 'https://mempool.space/api/v1/fees/recommended'
  const MEMPOOL_SPACE_FEE_URL_TESTNET =
    process.env.MEMPOOL_SPACE_FEE_URL_TESTNET ?? 'https://mempool.space/testnet/api/v1/fees/recommended'
  if (networkType === NetworkType.Testnet) url = MEMPOOL_SPACE_FEE_URL_TESTNET
  else url = MEMPOOL_SPACE_FEE_URL_MAINNET
  try {
    const body = await request.get(url, { json: true })
    const feePerKbField = FEE_LEVEL_TO_MEMPOOL_FIELD[feeLevel]
    const satPerByte = body[feePerKbField]
    if (!satPerByte) {
      throw new Error(`Response is missing expected field ${feePerKbField}`)
    }
    feeRate = String(satPerByte)
    logger.log(
      `Retrieved BTC ${networkType} fee rate of ${satPerByte} sat/vbyte from mempool.space for ${feeLevel} level`,
    )
  } catch (e) {
    throw new Error(`Failed to retrieve BTC ${networkType} fee rate from mempool.space - ${e.toString()}`)
  }
  return {
    feeRate,
    feeRateType: FeeRateType.BasePerWeight,
  }
}
