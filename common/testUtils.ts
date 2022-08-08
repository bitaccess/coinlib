import { omit } from 'lodash'
import { Logger } from '@bitaccess/ts-common'
import util from 'util'
import fs from 'fs'
import path from 'path'
import { TransactionStatus } from '../packages/coinlib-common/src'

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

const rootDir = path.resolve(__dirname, '..')
const logsDir = path.resolve(rootDir, 'logs')

function resolveLogFile(packageOrFileName: string): string {
  if (!packageOrFileName.includes('/')) {
    return path.resolve(logsDir, `test.${packageOrFileName}.log`)
  }
  if (packageOrFileName.includes(rootDir)) {
    let pathParts = packageOrFileName.slice(rootDir.length + 1).split('/')
    if (pathParts[0] === 'packages' && pathParts[2] === 'test') {
      pathParts = [pathParts[1], ...pathParts.slice(3)]
    }
    return path.resolve(logsDir, pathParts.join('/') + '.log')
  }
  throw new Error(`No idea how to handle TestLogger packageOrFileName: ${packageOrFileName}`)
}

export class TestLogger implements Logger {

  logFileDescriptor: number

  constructor(public packageOrFileName: string) {
    const logFilePath = resolveLogFile(packageOrFileName)
    const logFileDir = path.dirname(logFilePath)

    if (!fs.existsSync(logFileDir)) {
      fs.mkdirSync(logFileDir, { recursive: true })
    }

    this.logFileDescriptor = fs.openSync(logFilePath, 'w')
  }

  doLog(level: 'ERROR' | 'WARN' | 'INFO' | 'LOG' | 'DEBUG' | 'TRACE') {
    return (...args: any[]) => {
      const message = `${new Date().toISOString()} ${level} ${formatArgs(...args)}\n`
      if (process.env.VERBOSE || level === 'ERROR') {
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
