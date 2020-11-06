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

const RETRYABLE_ERRORS = ['timeout', 'disconnected', 'time-out', 'StatusCodeError: 522', 'StatusCodeError: 504', 'ENOTFOUND']
const MAX_RETRIES = 2

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
