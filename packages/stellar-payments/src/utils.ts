import * as Stellar from 'stellar-sdk'
import { NetworkType, Payport, isMatchingError } from '@faast/payments-common'
import promiseRetry from 'promise-retry'
import { Logger, isString, isObject, isNil } from '@faast/ts-common'

import { BaseStellarConfig, StellarRawTransaction, StellarLedger, StellarTransaction, StellarServerAPI } from './types'
import { DEFAULT_TESTNET_SERVER, DEFAULT_MAINNET_SERVER } from './constants'
import { omitBy, isFunction } from 'lodash'

export { isMatchingError }

export function serializePayport(payport: Payport): string {
  return isNil(payport.extraId) ? payport.address : `${payport.address}/${payport.extraId}`
}

export function omitHidden(o: object): object {
  return omitBy(o, (_, k) => k.startsWith('_'))
}

export function isStellarLedger(x: unknown): x is StellarLedger {
  return isObject(x) && x.hasOwnProperty('successful_transaction_count')
}

export function isStellarTransaction(x: unknown): x is StellarTransaction {
  return isObject(x) && x.hasOwnProperty('source_account')
}

export function isStellarTransactionRecord(x: unknown): x is Stellar.ServerApi.TransactionRecord {
  return isObject(x) && isFunction((x as any).ledger)
}

export function padLeft(x: string, n: number, v: string): string {
  while (x.length < n) {
    x = `${v}${x}`
  }
  return x
}

export type ResolvedServer = {
  api: StellarServerAPI | null
  server: string | null
}

export function resolveStellarServer(server: BaseStellarConfig['server'], network: NetworkType): ResolvedServer {
  if (typeof server === 'undefined') {
    server = network === NetworkType.Testnet ? DEFAULT_TESTNET_SERVER : DEFAULT_MAINNET_SERVER
  }
  if (isString(server)) {
    return {
      api: new StellarServerAPI(server),
      server,
    }
  } else if (server instanceof StellarServerAPI) {
    return {
      api: server,
      server: server.serverURL.toString(),
    }
  } else {
    // null server arg -> offline mode
    return {
      api: null,
      server: null,
    }
  }
}

const RETRYABLE_ERRORS = ['timeout', 'disconnected']
const MAX_RETRIES = 3

export function retryIfDisconnected<T>(fn: () => Promise<T>, stellarApi: StellarServerAPI, logger: Logger): Promise<T> {
  return promiseRetry(
    (retry, attempt) => {
      return fn().catch(async e => {
        if (isMatchingError(e, RETRYABLE_ERRORS)) {
          logger.log(
            `Retryable error during stellar server call, retrying ${MAX_RETRIES - attempt} more times`,
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
