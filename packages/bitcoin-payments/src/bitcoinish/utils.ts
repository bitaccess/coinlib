import { NetworkType, UtxoInfo } from '@faast/payments-common'
import { BlockbookBitcoin } from 'blockbook-client'
import { isString, Logger, isMatchingError, toBigNumber, assertType } from '@faast/ts-common'
import * as bitcoin from 'bitcoinjs-lib'
import promiseRetry from 'promise-retry'
import BigNumber from 'bignumber.js'
import crypto from 'crypto'

import {
  BlockbookConnectedConfig,
  BitcoinjsNetwork,
  AddressType,
  AddressTypeT,
  MultisigAddressType,
  SinglesigAddressType,
} from './types'

export function resolveServer(server: BlockbookConnectedConfig['server'], network: NetworkType): {
  api: BlockbookBitcoin
  server: string[] | null
} {
  if (isString(server)) {
    return {
      api: new BlockbookBitcoin({
        nodes: [server],
      }),
      server: [server],
    }
  } else if (server instanceof BlockbookBitcoin) {
    return {
      api: server,
      server: server.nodes,
    }
  } else if (Array.isArray(server)) {
    return {
      api: new BlockbookBitcoin({
        nodes: server,
      }),
      server,
    }
  } else {
    // null server arg -> offline mode
    return {
      api: new BlockbookBitcoin({
        nodes: [''],
      }),
      server: null,
    }
  }
}

const RETRYABLE_ERRORS = ['timeout', 'disconnected']
const MAX_RETRIES = 3

export function retryIfDisconnected<T>(fn: () => Promise<T>, api: BlockbookBitcoin, logger: Logger): Promise<T> {
  return promiseRetry(
    (retry, attempt) => {
      return fn().catch(async e => {
        if (isMatchingError(e, RETRYABLE_ERRORS)) {
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

/**
 * Sum the utxos values (main denomination)
 */
export function sumUtxoValue(utxos: UtxoInfo[], includeUnconfirmed?: boolean): BigNumber {
  const filtered = includeUnconfirmed ? utxos : utxos.filter(isConfirmedUtxo)
  return filtered.reduce((total, { value }) => total.plus(value), toBigNumber(0))
}

/**
 * Sort the utxos randomly for input selection.
 */
export function sortUtxos<T extends UtxoInfo>(utxoList: T[]): T[] {
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

/** Group objects by a common field */
export function groupByField<F extends string, O extends { [f in F]: string }>(
  objects: O[],
  field: F,
): { [k in O[F]]: O[] } {
  return objects.reduce((result, o) => {
    const key = o[field]
    result[key] = [...(result[key] || []), o]
    return result
  }, {} as { [k in O[F]]: O[] })
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
 */
export function estimateBitcoinTxSize(
  inputCounts: { [k: string]: number },
  outputCounts: { [k: string]: number },
  network?: BitcoinjsNetwork,
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
