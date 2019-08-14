import util from 'util'
import { Logger } from '@faast/ts-common'
import { TransactionStatus } from '@faast/payments-common'
import { omit } from 'lodash'

export const END_TRANSACTION_STATES = [TransactionStatus.Confirmed, TransactionStatus.Failed]

export async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function formatArgs(...args: any[]): string {
  return args
    .map(arg => {
      if (typeof arg === 'string') {
        return arg
      }
      return util.inspect(arg)
    })
    .join(' ')
}

function logLevel(level: 'ERROR' | 'WARN' | 'INFO' | 'LOG' | 'DEBUG' | 'TRACE') {
  return (...args: any[]) => {
    const stream = level === 'ERROR' || level === 'WARN' ? process.stderr : process.stderr
    const message = formatArgs(...args)
    stream.write(`${level[0]} ${message}\n`)
  }
}

export class TestLogger implements Logger {
  error = logLevel('ERROR')
  warn = logLevel('WARN')
  info = logLevel('INFO')
  log = logLevel('LOG')
  debug = logLevel('DEBUG')
  trace = logLevel('TRACE')
}

export function expectEqualOmit(actual: any, expected: any, omitFields: string[]) {
  expect(omit(actual, omitFields)).toEqual(omit(expected, omitFields))
}

export function expectEqualWhenTruthy(actual: any, expected: any) {
  if (!expected) {
    expect(actual).toBeFalsy()
  } else {
    expect(actual).toBe(expected)
  }
}
