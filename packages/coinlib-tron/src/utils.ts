import { isMatchingError, Logger } from '@bitaccess/ts-common'
import promiseRetry from 'promise-retry'

/** Converts strings to Error */
export function toError(e: any): any {
  if (typeof e === 'string') {
    return new Error(e)
  }
  return e
}

const RETRYABLE_ERRORS = [
  'Request failed',
]
const MAX_RETRIES = 2

export function retryIfDisconnected<T>(fn: () => Promise<T>, logger: Logger): Promise<T> {
  return promiseRetry(
    (retry, attempt) => {
      return fn().catch(async e => {
        e = toError(e)
        if (isMatchingError(e, RETRYABLE_ERRORS)) {
          logger.log(
            `Retryable error during tron-payments call, retrying ${MAX_RETRIES - attempt} more times`,
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
