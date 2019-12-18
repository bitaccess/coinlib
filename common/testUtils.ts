import { omit } from 'lodash'
import { Logger } from '@faast/ts-common'
import util from 'util'
import fs from 'fs'
import path from 'path'

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

  logFile: any

  constructor(public packageName: string) {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }

    this.logFile = fs.createWriteStream(
      path.resolve(logDir, `test.${packageName}.log`), { flags: 'w' }
    )
  }

  doLog(level: 'ERROR' | 'WARN' | 'INFO' | 'LOG' | 'DEBUG' | 'TRACE') {
    return (...args: any[]) => {
      const message = `${level} ${formatArgs(...args)}\n`
      if (level === 'ERROR' || level === 'WARN' || level === 'INFO') {
        process.stderr.write(message)
      }
      this.logFile.write(message)
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
  expect(omit(actual, omitFields)).toEqual(omit(expected, omitFields))
}

export function expectEqualWhenTruthy(actual: any, expected: any) {
  if (!expected) {
    expect(actual).toBeFalsy()
  } else {
    expect(actual).toBe(expected)
  }
}
