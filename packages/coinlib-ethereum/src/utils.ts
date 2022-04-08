import { isMatchingError, isString, Logger } from '@faast/ts-common'
import { BlockbookEthereum } from 'blockbook-client'
import promiseRetry from 'promise-retry'
import { EthereumBlockbookConnectedConfig } from './types'

const RETRYABLE_ERRORS = ['request failed or timed out']
const MAX_RETRIES = 2

export function retryIfDisconnected<T>(
  fn: () => Promise<T>,
  logger: Logger,
  additionalRetryableErrors: string[] = [],
): Promise<T> {
  return promiseRetry(
    (retry, attempt) => {
      return fn().catch(async e => {
        if (isMatchingError(e, [...RETRYABLE_ERRORS, ...additionalRetryableErrors])) {
          logger.log(
            `Retryable error during ethereum-payments call, retrying ${MAX_RETRIES - attempt} more times`,
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

export function resolveServer(
  { server, requestTimeoutMs, api }: EthereumBlockbookConnectedConfig,
  logger: Logger,
): {
  api: BlockbookEthereum
  server: string[] | null
} {
  if (api) {
    return {
      api: api,
      server: api.nodes,
    }
  }

  if (isString(server)) {
    return {
      api: new BlockbookEthereum({
        nodes: [server],
        logger,
        requestTimeoutMs: requestTimeoutMs,
      }),
      server: [server],
    }
  }

  if (server instanceof BlockbookEthereum) {
    return {
      api: server,
      server: server.nodes,
    }
  }

  if (Array.isArray(server)) {
    return {
      api: new BlockbookEthereum({
        nodes: server,
        logger,
        requestTimeoutMs: requestTimeoutMs,
      }),
      server,
    }
  }

  // null server arg -> offline mode
  return {
    api: new BlockbookEthereum({
      nodes: [''],
      logger,
      requestTimeoutMs,
    }),
    server: null,
  }
}
