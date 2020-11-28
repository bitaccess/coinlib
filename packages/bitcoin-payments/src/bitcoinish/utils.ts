import { NetworkType, UtxoInfo, AutoFeeLevels, FeeRate, FeeRateType } from '@faast/payments-common'
import { BlockbookBitcoin } from 'blockbook-client'
import { isString, Logger, isMatchingError, toBigNumber, isNumber } from '@faast/ts-common'
import request from 'request-promise-native'
import promiseRetry from 'promise-retry'
import BigNumber from 'bignumber.js'
import crypto from 'crypto'

import { BlockbookConnectedConfig } from './types'
import { FeeLevel } from '../../../payments-common/src/types';

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

const RETRYABLE_ERRORS = [
  'timeout', 'disconnected', 'time-out', 'StatusCodeError: 522', 'StatusCodeError: 504', 'ENOTFOUND', 'ESOCKETTIMEDOUT', 'ETIMEDOUT',
]
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

/** Blockbook estimate fee returns a single value, scale it by a factor to get each level */
const blockbookFeeRateMultipliers = {
  [FeeLevel.High]: 2,
  [FeeLevel.Medium]: 1,
  [FeeLevel.Low]: 0.5,
}

export async function getBlockbookFeeRecommendation(
  feeLevel: AutoFeeLevels,
  coinSymbol: string,
  networkType: NetworkType,
  blockbookClient: BlockbookBitcoin,
  logger: Logger,
): Promise<FeeRate> {
  let feeRate: string
  try {
    const body = await blockbookClient.doRequest('GET', '/api/v1/estimatefee/3')
    const fee = body['result'] // main units per kb
    if (!fee) {
      throw new Error("Blockbook estimatefee response is missing expected field 'result'")
    }
    if (!isNumber(fee) || fee <= 0) {
      throw new Error(`Blockbook estimatefee result is not a positive number: ${fee}`)
    }
    const satPerByte = fee * 100000
    const multiplier = blockbookFeeRateMultipliers[feeLevel]
    feeRate = String(satPerByte * multiplier)
    logger.log(`Retrieved ${coinSymbol} ${networkType} fee rate of ${satPerByte} sat/vbyte from blockbook, using ${feeRate} for ${feeLevel} level`)
  } catch (e) {
    throw new Error(`Failed to retrieve ${coinSymbol} ${networkType} fee rate from blockbook - ${e.toString()}`)
  }
  return {
    feeRate,
    feeRateType: FeeRateType.BasePerWeight,
  }
}
