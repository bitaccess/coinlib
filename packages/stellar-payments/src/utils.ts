import * as Stellar from 'stellar-sdk'
import { NetworkType, Payport } from '@faast/payments-common'
import promiseRetry from 'promise-retry'
import { Logger, isString, isObject, isNil } from '@faast/ts-common'

import { BaseStellarConfig, StellarRawTransaction, StellarLedger, StellarTransaction } from './types'
import { DEFAULT_TESTNET_SERVER, DEFAULT_MAINNET_SERVER } from './constants'
import { omitBy } from 'lodash';

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

export function padLeft(x: string, n: number, v: string): string {
  while (x.length < n) {
    x = `${v}${x}`
  }
  return x
}

export type ResolvedServer = {
  api: Stellar.Server | null
  server: string | null
}

export function resolveStellarServer(server: BaseStellarConfig['server'], network: NetworkType): ResolvedServer {
  if (typeof server === 'undefined') {
    server = network === NetworkType.Testnet ? DEFAULT_TESTNET_SERVER : DEFAULT_MAINNET_SERVER
  }
  if (isString(server)) {
    return {
      api: new Stellar.Server(server),
      server,
    }
  } else if (server instanceof Stellar.Server) {
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

const CONNECTION_ERRORS = ['ConnectionError', 'NotConnectedError', 'DisconnectedError']
const RETRYABLE_ERRORS = [...CONNECTION_ERRORS, 'TimeoutError']
const MAX_RETRIES = 3

export function retryIfDisconnected<T>(fn: () => Promise<T>, stellarApi: Stellar.Server, logger: Logger): Promise<T> {
  return promiseRetry(
    (retry, attempt) => {
      return fn().catch(async e => {
        const eName = e ? e.constructor.name : ''
        if (RETRYABLE_ERRORS.includes(eName)) {
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
