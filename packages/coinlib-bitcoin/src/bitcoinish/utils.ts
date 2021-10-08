import { NetworkType, UtxoInfo, AutoFeeLevels, FeeRate, FeeRateType, FeeLevel } from '@bitaccess/coinlib-common'
import { BlockbookBitcoin } from 'blockbook-client'
import { isString, Logger, isMatchingError, toBigNumber, isNumber, assertType } from '@faast/ts-common'
import request from 'request-promise-native'
import promiseRetry from 'promise-retry'
import BigNumber from 'bignumber.js'
import crypto from 'crypto'
import bs58 from 'bs58'

import {
  AddressType, AddressTypeT, BlockbookConnectedConfig,
  BlockbookServerAPI, MultisigAddressType, SinglesigAddressType,
} from './types'

export function resolveServer(config: BlockbookConnectedConfig, logger: Logger): {
  api: BlockbookServerAPI
  server: string[] | null
} {
  const { server } = config
  if (config.api) {
    return {
      api: config.api,
      server: config.api.nodes,
    }
  } else if (isString(server)) {
    return {
      api: new BlockbookServerAPI({
        nodes: [server],
        logger,
        requestTimeoutMs: config.requestTimeoutMs,
      }),
      server: [server],
    }
  } else if (server instanceof BlockbookBitcoin || server instanceof BlockbookServerAPI) {
    return {
      api: server,
      server: server.nodes,
    }
  } else if (Array.isArray(server)) {
    return {
      api: new BlockbookServerAPI({
        nodes: server,
        logger,
        requestTimeoutMs: config.requestTimeoutMs,
      }),
      server,
    }
  } else {
    // null server arg -> offline mode
    return {
      api: new BlockbookServerAPI({
        nodes: [''],
        logger,
        requestTimeoutMs: config.requestTimeoutMs,
      }),
      server: null,
    }
  }
}

const RETRYABLE_ERRORS = [
  'timeout', 'disconnected', 'time-out', 'StatusCodeError: 522', 'StatusCodeError: 504', 'ENOTFOUND', 'ESOCKETTIMEDOUT', 'ETIMEDOUT',
]
const MAX_RETRIES = 2

export function retryIfDisconnected<T>(
  fn: () => Promise<T>,
  api: BlockbookBitcoin,
  logger: Logger,
  additionalRetryableErrors: string[] = [],
): Promise<T> {
  return promiseRetry(
    (retry, attempt) => {
      return fn().catch(async e => {
        if (isMatchingError(e, [...RETRYABLE_ERRORS, ...additionalRetryableErrors])) {
          logger.log(
            `Retryable error during blockbook server call, retrying ${MAX_RETRIES - attempt} more times`,
            e.toString(),
          )
          retry(e)
        }
        throw e
      })
    },
    {
      retries: MAX_RETRIES,
    },
  )
}

/** returns the sum of a particular field in an array of items */
export function sumField<T extends { [key: string]: any }>(items: T[], field: keyof T): BigNumber {
  return items.reduce((total, item) => total.plus(item[field]), toBigNumber(0))
}

/**
 * Sum the utxos values (main denomination)
 */
export function sumUtxoValue(utxos: UtxoInfo[], includeUnconfirmed?: boolean): BigNumber {
  const filtered = includeUnconfirmed ? utxos : utxos.filter(isConfirmedUtxo)
  return sumField(filtered, 'value')
}

export function countOccurences<T extends string[]>(a: T): { [key: string]: number } {
  return a.reduce((result, element) => {
    result[element] = (result[element] ?? 0) + 1
    return result
  }, {} as { [key: string]: number })
}

/**
 * Shuffle the utxos for input selection.
 */
export function shuffleUtxos<T extends UtxoInfo>(utxoList: T[]): T[] {
  const result = [...utxoList]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * i)
    const temp = result[i]
    result[i] = result[j]
    result[j] = temp
  }
  return result
}

export function isConfirmedUtxo(utxo: UtxoInfo): boolean {
  return Boolean((utxo.confirmations && utxo.confirmations > 0) || (utxo.height && Number.parseInt(utxo.height) > 0))
}

export function sha256FromHex(hex: string): string {
  return hex
    ? crypto.createHash('sha256').update(Buffer.from(hex, 'hex')).digest('hex')
    : ''
}

export async function getBlockcypherFeeRecommendation(
  feeLevel: AutoFeeLevels,
  coinSymbol: string,
  networkType: NetworkType,
  blockcypherToken: string | undefined,
  logger: Logger,
): Promise<FeeRate> {
  let feeRate: string
  try {
    const networkParam = networkType === NetworkType.Mainnet ? 'main' : 'test3'
    const tokenQs = blockcypherToken ? `?token=${blockcypherToken}` : ''
    const body = await request.get(
      `https://api.blockcypher.com/v1/${coinSymbol.toLowerCase()}/${networkParam}${tokenQs}`,
      { json: true },
    )
    const feePerKbField = `${feeLevel}_fee_per_kb`
    const feePerKb = body[feePerKbField]
    if (!feePerKb) {
      throw new Error(`Response is missing expected field ${feePerKbField}`)
    }
    const satPerByte = feePerKb / 1000
    feeRate = String(satPerByte)
    logger.log(`Retrieved ${coinSymbol} ${networkType} fee rate of ${satPerByte} sat/vbyte from blockcypher for ${feeLevel} level`)
  } catch (e) {
    throw new Error(`Failed to retrieve ${coinSymbol} ${networkType} fee rate from blockcypher - ${e.toString()}`)
  }
  return {
    feeRate,
    feeRateType: FeeRateType.BasePerWeight,
  }
}

export async function getBlockbookFeeRecommendation(
  blockTarget: number,
  coinSymbol: string,
  networkType: NetworkType,
  blockbookClient: BlockbookBitcoin,
  logger: Logger,
): Promise<FeeRate> {
  let feeRate: string
  try {
    const btcPerKbString = await blockbookClient.estimateFee(blockTarget)
    const fee = new BigNumber(btcPerKbString)
    if (fee.isNaN() || fee.lte(0)) {
      throw new Error(`Blockbook estimatefee result is not a positive number: ${btcPerKbString}`)
    }
    const satPerByte = fee.times(100000)
    feeRate = satPerByte.toFixed()
    logger.log(`Retrieved ${coinSymbol} ${networkType} fee rate of ${satPerByte} sat/vbyte from blockbook, using ${feeRate} for ${blockTarget} block target`)
  } catch (e) {
    throw new Error(`Failed to retrieve ${coinSymbol} ${networkType} fee rate from blockbook - ${e.toString()}`)
  }
  return {
    feeRate,
    feeRateType: FeeRateType.BasePerWeight,
  }
}

// assumes compressed pubkeys in all cases.
export const ADDRESS_INPUT_WEIGHTS: { [k in AddressType]: number } = {
  [AddressType.Legacy]: 148 * 4,
  [AddressType.SegwitP2SH]: 108 + (64 * 4),
  [AddressType.SegwitNative]: 108 + (41 * 4),
  [AddressType.MultisigLegacy]: 49 * 4,
  [AddressType.MultisigSegwitP2SH]: 6 + (76 * 4),
  [AddressType.MultisigSegwitNative]: 6 + (41 * 4),
}

export const ADDRESS_OUTPUT_WEIGHTS: { [k in AddressType]: number } = {
  [AddressType.Legacy]: 34 * 4,
  [AddressType.SegwitP2SH]: 32 * 4,
  [AddressType.SegwitNative]: 31 * 4,
  [AddressType.MultisigLegacy]: 34 * 4,
  [AddressType.MultisigSegwitP2SH]: 34 * 4,
  [AddressType.MultisigSegwitNative]: 43 * 4
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
 *
 * @param toOutputScript - An function equivalent to bitcoin.address.toOutputScript without the network arg
 *    ie (address) => bitcoin.address.toOutputScript(address, bitcoin.networks.testnet)
 */
export function estimateTxSize(
  inputCounts: { [k: string]: number },
  outputCounts: { [k: string]: number },
  toOutputScript: (address: string) => Buffer
) {
  let totalWeight = 0
  let hasWitness = false
  let totalInputs = 0
  let totalOutputs = 0

  Object.keys(inputCounts).forEach((key) => {
    const count = inputCounts[key]
    checkUInt53(count)
    if (key.includes(':')) {
      // ex. "p2sh-p2ms:2-3" would mean 2 of 3 P2SH MULTISIG
      let keyParts = key.split(':')
      if (keyParts.length !== 2) throw new Error('invalid inputCounts key: ' + key)
      let addressType = assertType(MultisigAddressType, keyParts[0], 'inputCounts key')
      let [m,n] = keyParts[1].split('-').map((x) => parseInt(x))

      totalWeight += ADDRESS_INPUT_WEIGHTS[addressType] * count
      let multiplyer = (addressType === AddressType.MultisigLegacy) ? 4 : 1
      totalWeight += ((73 * m) + (34 * n)) * multiplyer * count
    } else {
      const addressType = assertType(SinglesigAddressType, key, 'inputCounts key')
      totalWeight += ADDRESS_INPUT_WEIGHTS[addressType] * count
    }
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
        const outputScript = toOutputScript(key)
        totalWeight += (outputScript.length + 9) * 4 * count
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

export function bip32MagicNumberToPrefix(magicNum: number): string {
  const b = Buffer.alloc(82)
  b.writeUInt32BE(magicNum, 0)
  return bs58.encode(b).slice(0, 4)
}
