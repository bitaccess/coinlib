import { NetworkType, FeeLevel, FeeRateType, AutoFeeLevels } from '@faast/payments-common'
import request from 'request-promise-native'
import bs58 from 'bs58'
import { BaseBitcoinPaymentsConfig } from './types'
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
  DEFAULT_NETWORK_MIN_RELAY_FEE,
  DEFAULT_MIN_TX_FEE,
  DEFAULT_FEE_LEVEL,
} from './constants'

const DEFAULT_BITCOINISH_CONFIG = {
  coinSymbol: COIN_SYMBOL,
  coinName: COIN_NAME,
  decimals: DECIMAL_PLACES,
  dustThreshold: DEFAULT_DUST_THRESHOLD,
  networkMinRelayFee: DEFAULT_NETWORK_MIN_RELAY_FEE,
  minTxFee: {
    feeRate: DEFAULT_MIN_TX_FEE.toString(),
    feeRateType: FeeRateType.BasePerWeight,
  },
  defaultFeeLevel: DEFAULT_FEE_LEVEL as AutoFeeLevels,
}

export function bip32MagicNumberToPrefix(magicNum: number): string {
  const b = Buffer.alloc(82)
  b.writeUInt32BE(magicNum, 0)
  return bs58.encode(b).slice(0, 4)
}

export function toBitcoinishConfig<T extends BaseBitcoinPaymentsConfig>(config: T): BitcoinishPaymentsConfig {
  const configWithDefaults = {
    ...DEFAULT_BITCOINISH_CONFIG,
    ...config,
    network: config.network || DEFAULT_NETWORK,
  }
  const { network, server } = configWithDefaults
  return {
    ...configWithDefaults,
    bitcoinjsNetwork: network === NetworkType.Testnet ? NETWORK_TESTNET : NETWORK_MAINNET,
    server: typeof server !== 'undefined'
      ? server
      : (network === NetworkType.Testnet
        ? DEFAULT_TESTNET_SERVER
        : DEFAULT_MAINNET_SERVER),
  }
}

/** Get sat/byte fee estimate from blockcypher */
export async function getBlockcypherFeeEstimate(feeLevel: FeeLevel, networkType: NetworkType): Promise<number> {
  const body = await request.get(
    `https://api.blockcypher.com/v1/btc/${networkType === NetworkType.Mainnet ? 'main' : 'test3'}`,
    { json: true },
  )
  const feePerKbField = `${feeLevel}_fee_per_kb`
  const feePerKb = body[feePerKbField]
  if (!feePerKb) {
    throw new Error(`Blockcypher response is missing expected field ${feePerKbField}`)
  }
  return feePerKb / 1000
}
