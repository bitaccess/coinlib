import { omit } from 'lodash'
import { Logger } from '@faast/ts-common'
import util from 'util'
import fs from 'fs'
import path from 'path'
import { TransactionStatus } from '../packages/payments-common/src'

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

const logDir = path.resolve(__dirname, '../logs')

export class TestLogger implements Logger {

  logFileDescriptor: number

  constructor(public packageName: string) {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }

    this.logFileDescriptor = fs.openSync(
      path.resolve(logDir, `test.${packageName}.log`), 'w'
    )
  }

  doLog(level: 'ERROR' | 'WARN' | 'INFO' | 'LOG' | 'DEBUG' | 'TRACE') {
    return (...args: any[]) => {
      const message = `${level} ${formatArgs(...args)}\n`
      if (process.env.VERBOSE || level === 'ERROR' || level === 'WARN' || level === 'INFO') {
        process.stderr.write(message)
      }
      fs.writeSync(this.logFileDescriptor, message)
    }
  }

  error = this.doLog('ERROR')
  warn = this.doLog('WARN')
  info = this.doLog('INFO')
  log = this.doLog('LOG')
  debug = this.doLog('DEBUG')
  trace = this.doLog('TRACE')
}

export function expectEqualOmit(actual: any, expected: any, omitFields: string[]) {
  if (Array.isArray(expected)) {
    expected = expected.map((elem) => omit(elem, omitFields))
    expect(actual).toBeInstanceOf(Array)
    actual = (actual as any[]).map((elem) => omit(elem, omitFields))
  } else {
    actual = omit(actual, omitFields)
    expected = omit(expected, omitFields)
  }
  expect(actual).toEqual(expected)
}

export function expectEqualWhenTruthy(actual: any, expected: any) {
  if (!expected) {
    expect(actual).toBeFalsy()
  } else {
    expect(actual).toBe(expected)
  }
}
