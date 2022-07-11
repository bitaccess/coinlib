import { FeeLevel } from '@bitaccess/coinlib-common'
import { FeeLevelBlockTargets } from './types'
import { networks } from 'bitcoinjs-lib-bigint'


export const DEFAULT_FEE_LEVEL_BLOCK_TARGETS: FeeLevelBlockTargets = {
  [FeeLevel.High]: 1,
  [FeeLevel.Medium]: 24,
  [FeeLevel.Low]: 144,
}

export const BITCOIN_COINTYPE_MAINNET =  `0`
export const BITCOIN_COINTYPE_TESTNET =  `1`

export const NETWORK_MAINNET = networks.bitcoin
export const NETWORK_TESTNET = networks.testnet