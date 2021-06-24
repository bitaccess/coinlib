import { isMatchingError, Logger } from '@faast/ts-common'
import promiseRetry from 'promise-retry'

const RETRYABLE_ERRORS = [
  'request failed or timed out',
]
const MAX_RETRIES = 2

export function retryIfDisconnected<T>(fn: () => Promise<T>, logger: Logger): Promise<T> {
  return promiseRetry(
    (retry, attempt) => {
      return fn().catch(async e => {
        if (isMatchingError(e, RETRYABLE_ERRORS)) {
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
