import fetch from 'node-fetch'
import util from 'util'
import path from 'path'
import fs from 'fs'
import { AccountStellarPayments } from '../src'
import { AccountStellarPaymentsConfig, StellarAccountConfig } from '../src/types'
import { Logger, assertType } from '@faast/ts-common'
import { TransactionStatus, NetworkType } from '@faast/payments-common'
import { omit } from 'lodash'
import * as Stellar from 'stellar-sdk'

const TESTNET_SERVER = 'https://horizon-testnet.stellar.org'
const TEST_ACCOUNT_FILE = path.resolve(__dirname, 'keys/testnet.accounts.key')
export const END_TRANSACTION_STATES = [TransactionStatus.Confirmed, TransactionStatus.Failed]

async function generateTestnetAccount(): Promise<StellarAccountConfig> {
  const pair = Stellar.Keypair.random()
  const address = pair.publicKey()
  const res = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(address)}`)
  const result = await res.json()
  if (typeof result !== 'object' || result === null || !result.hash) {
    throw new Error(`Unexpected testnet faucet result for ${address} ${util.inspect(result)}`)
  }
  return {
    address,
    secret: pair.secret(),
  }
}

export async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function generatePaymentsConfig(): Promise<AccountStellarPaymentsConfig> {
  logger.log('Generating testnet payments accounts using faucet')
  const hotAccount = await generateTestnetAccount()
  await delay(1000)
  const depositAccount = await generateTestnetAccount()
  const config: AccountStellarPaymentsConfig = {
    hotAccount,
    depositAccount,
  }
  fs.writeFileSync(TEST_ACCOUNT_FILE, JSON.stringify(config), { encoding: 'utf8' })
  return config
}

export async function setupTestnetPayments(): Promise<AccountStellarPayments> {
  let config: AccountStellarPaymentsConfig | undefined
  // Load saved testnet accounts
  if (fs.existsSync(TEST_ACCOUNT_FILE)) {
    const stringContents = fs.readFileSync(TEST_ACCOUNT_FILE, { encoding: 'utf8' })
    try {
      const jsonContents = JSON.parse(stringContents)
      config = assertType(AccountStellarPaymentsConfig, jsonContents)
    } catch (e) {
      logger.log(`Failed to parse testnet account file: ${TEST_ACCOUNT_FILE}`)
      config = await generatePaymentsConfig()
    }
  } else {
    config = await generatePaymentsConfig()
  }

  const DEFAULT_CONFIG = {
    network: NetworkType.Testnet,
    server: TESTNET_SERVER,
    logger,
  }
  let payments = new AccountStellarPayments({
    ...DEFAULT_CONFIG,
    ...config,
  })
  await payments.init()
  // Ensure accounts still exist, testnet can be wiped
  try {
    await payments.getBalance(0)
    await payments.getBalance(1)
  } catch (e) {
    if (e.message.includes('Account not found')) {
      logger.warn('Cached testnet accounts have been reset, will regenerate')
      config = await generatePaymentsConfig()
      payments = new AccountStellarPayments({
        ...DEFAULT_CONFIG,
        ...config,
      })
    }
  }
  return payments
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

export const logger = new TestLogger()

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
