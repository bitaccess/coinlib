import * as Stellar from 'stellar-sdk'
import { isString } from 'util'
import { NetworkType } from '@faast/payments-common'
import promiseRetry from 'promise-retry'
import { Logger } from '@faast/ts-common'

import { BaseStellarConfig } from './types'
import { DEFAULT_TESTNET_SERVER, DEFAULT_MAINNET_SERVER } from './constants'

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
          if (CONNECTION_ERRORS.includes(eName)) {
            logger.log(
              'Connection error during stellarApi call, attempting to reconnect then ' +
                `retrying ${MAX_RETRIES - attempt} more times`,
              e.toString(),
            )
            if (stellarApi.isConnected()) {
              await stellarApi.disconnect()
            }
            await stellarApi.connect()
          } else {
            logger.log(
              `Retryable error during stellarApi call, retrying ${MAX_RETRIES - attempt} more times`,
              e.toString(),
            )
          }
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
