import { NetworkType, FeeLevel, FeeRateType, AutoFeeLevels } from '@faast/payments-common'
import request from 'request-promise-native'
import bs58 from 'bs58'
import * as bitcoin from 'bitcoinjs-lib'
import { BaseDogePaymentsConfig, AddressType, SinglesigAddressType, AddressTypeT } from './types'
import { BitcoinishPaymentsConfig } from '@faast/bitcoin-payments'
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
import { assertType } from '@faast/ts-common';

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

export function toBitcoinishConfig<T extends BaseDogePaymentsConfig>(config: T): BitcoinishPaymentsConfig {
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

// assumes compressed pubkeys in all cases.
export const ADDRESS_INPUT_WEIGHTS: { [k in AddressType]: number } = {
  [AddressType.Legacy]: 148 * 4,
}

export const ADDRESS_OUTPUT_WEIGHTS: { [k in AddressType]: number } = {
  [AddressType.Legacy]: 34 * 4,
}

function checkUInt53 (n: number) {
  if (n < 0 || n > Number.MAX_SAFE_INTEGER || n % 1 !== 0) throw new RangeError('value out of range')
}

function varIntLength (n: number) {
  checkUInt53(n)

  return (
    n < 0xfd ? 1
      : n <= 0xffff ? 3
      : n <= 0xffffffff ? 5
      : 9
  )
}

/**
 * Estimate the size of a bitcoin tx in vbytes
 *
 * Usage:
 *
 * `estimateTxSize({'p2sh-p2ms:2-4':4},{'p2pkh':1,'1J5d68gBGsNS8bxMGBnjCHorYCYGXQnM65': 1})`
 *   Means "4 inputs of P2SH Multisig, 1 output of P2PKH, and one output to 1J5d68gBGsNS8bxMGBnjCHorYCYGXQnM65"
 *
 * `estimateTxSize({'p2pkh':1,'p2sh-p2wsh-p2ms:2-3':2},{'p2wpkh':2})`
 *   means "1 P2PKH input and 2 Multisig segwit P2SH (2 of 3) inputs along with 2 native segwit outputs"
 *
 * Adapted from: https://gist.github.com/junderw/b43af3253ea5865ed52cb51c200ac19c
 */
export function estimateBitcoinTxSize(
  inputCounts: { [k: string]: number },
  outputCounts: { [k: string]: number },
  network?: bitcoin.Network,
) {
  let totalWeight = 0
  let hasWitness = false
  let totalInputs = 0
  let totalOutputs = 0

  Object.keys(inputCounts).forEach((key) => {
    const count = inputCounts[key]
    checkUInt53(count)
    const addressType = assertType(SinglesigAddressType, key, 'inputCounts key')
    totalWeight += ADDRESS_INPUT_WEIGHTS[addressType] * count
    totalInputs += count
    if (key.indexOf('W') >= 0) hasWitness = true
  })

  Object.keys(outputCounts).forEach(function(key) {
    const count = outputCounts[key]
    checkUInt53(count)
    if (AddressTypeT.is(key)) {
      totalWeight += ADDRESS_OUTPUT_WEIGHTS[key] * count
    } else {
      try {
        const outputScript = bitcoin.address.toOutputScript(key, network)
        totalWeight += (outputScript.length + 9) * 4
      } catch(e) {
        throw new Error('invalid outputCounts key: ' + key)
      }
    }
    totalOutputs += count
  })

  if (hasWitness) totalWeight += 2

  totalWeight += 8 * 4
  totalWeight += varIntLength(totalInputs) * 4
  totalWeight += varIntLength(totalOutputs) * 4

  return Math.ceil(totalWeight / 4)
}
