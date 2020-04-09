import { NetworkType, UtxoInfo } from '@faast/payments-common'
import { BlockbookConnectedConfig, BitcoinishTxOutput, BitcoinishTxOutputSatoshis } from './types';
import { BlockbookBitcoin } from 'blockbook-client'
import { isString, Logger, isMatchingError, toBigNumber } from '@faast/ts-common'
import promiseRetry from 'promise-retry'
import BigNumber from 'bignumber.js'
import crypto from 'crypto'

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

// in most cases (P2PKH):
// 10 = version: 4, locktime: 4, inputs and outputs count: 1
// 148 = txId: 32, vout: 4, count: 1, script: 107, sequence: 4
// 34 = value: 8, count: 1, scriptPubKey: 25
// This esimate also appears accurate for P2WPKH
export function estimateTxSize (inputsCount: number, outputsCount: number, handleSegwit: boolean) {
  return 10 + (148 * inputsCount) + (34 * outputsCount)
}

export function estimateTxFee (satPerByte: number, inputsCount: number, outputsCount: number, handleSegwit: boolean) {
  return estimateTxSize(inputsCount, outputsCount, handleSegwit) * satPerByte
}

/**
 * Sum the utxos values (main denomination)
 */
export function sumUtxoValue(utxos: UtxoInfo[], includeUnconfirmed?: boolean): BigNumber {
  const filtered = (includeUnconfirmed
    ? utxos.filter(isConfirmedUtxo)
    : utxos)
  return filtered.reduce((total, { value }) => total.plus(value), toBigNumber(0))
}

/**
 * Sort the utxos for input selection
 */
export function sortUtxos<T extends UtxoInfo>(utxoList: T[]): T[] {
  const result = [...utxoList]
  result.sort((a, b) => toBigNumber(a.value).minus(b.value).toNumber()) // Ascending order by value
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
