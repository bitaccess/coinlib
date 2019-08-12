import fetch from 'node-fetch'
import util from 'util'
import path from 'path'
import fs from 'fs'
import { AccountRipplePayments } from '../src'
import { AccountRipplePaymentsConfig, RippleAccountConfig } from '../src/types'
import { Logger, assertType } from '@faast/ts-common'
import { TransactionStatus } from '@faast/payments-common'
import { omit } from 'lodash'

const TESTNET_SERVER = 'wss://s.altnet.rippletest.net:51233'
const TEST_ACCOUNT_FILE = path.resolve(__dirname, 'keys/testnet.accounts.key')
export const END_TRANSACTION_STATES = [TransactionStatus.Confirmed, TransactionStatus.Failed]

async function generateTestnetAccount(): Promise<RippleAccountConfig> {
  const res = await fetch('https://faucet.altnet.rippletest.net/accounts', {
    headers: { accept: 'application/json, text/javascript, */*; q=0.01' },
    method: 'POST',
  })
  const result = await res.json()
  if (typeof result !== 'object' || result === null || !result.balance || !result.account) {
    throw new Error(`Unexpected testnet faucet result ${util.inspect(result)}`)
  }
  return result.account
}

export async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function generatePaymentsConfig(): Promise<AccountRipplePaymentsConfig> {
  console.log('Generating testnet payments accounts using faucet')
  const hotAccount = await generateTestnetAccount()
  await delay(1000)
  const depositAccount = await generateTestnetAccount()
  const config: AccountRipplePaymentsConfig = {
    hotAccount,
    depositAccount,
  }
  fs.writeFileSync(TEST_ACCOUNT_FILE, JSON.stringify(config), { encoding: 'utf8' })
  return config
}

export async function setupTestnetPayments() {
  let config: AccountRipplePaymentsConfig | undefined
  // Load saved testnet accounts
  if (fs.existsSync(TEST_ACCOUNT_FILE)) {
    const stringContents = fs.readFileSync(TEST_ACCOUNT_FILE, { encoding: 'utf8' })
    try {
      const jsonContents = JSON.parse(stringContents)
      config = assertType(AccountRipplePaymentsConfig, jsonContents)
    } catch (e) {
      console.log(`Failed to parse testnet account file: ${TEST_ACCOUNT_FILE}`)
      config = await generatePaymentsConfig()
    }
  } else {
    config = await generatePaymentsConfig()
  }

  const DEFAULT_CONFIG = {
    server: TESTNET_SERVER,
    logger: new TestLogger(),
  }
  let rp = new AccountRipplePayments({
    ...DEFAULT_CONFIG,
    ...config,
  })
  await rp.setup()
  // Make sure we still have a balance, testnet can be wiped
  const hotWalletBalances = await rp.getBalance(0)
  const depositWalletBalances = await rp.getBalance(1)
  if (!hotWalletBalances.sweepable || !depositWalletBalances.sweepable) {
    console.warn(
      'Existing testnet accounts have insufficient balances, will regenerate ' +
        `(${hotWalletBalances.confirmedBalance} XRP and ${depositWalletBalances.confirmedBalance} XRP)`,
    )
    config = await generatePaymentsConfig()
    rp = new AccountRipplePayments({
      ...DEFAULT_CONFIG,
      ...config,
    })
  }
  return rp
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
