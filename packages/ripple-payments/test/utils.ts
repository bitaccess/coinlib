import fetch from 'node-fetch'
import util from 'util'
import path from 'path'
import fs from 'fs'
import { AccountRipplePayments } from '../src'
import { AccountRipplePaymentsConfig, RippleAccountConfig } from '../src/types'
import { assertType } from '@faast/ts-common'
import { TransactionStatus, NetworkType } from '@faast/payments-common'
import { PACKAGE_NAME } from '../src/constants'

export * from '../../../common/testUtils'
import { TestLogger } from '../../../common/testUtils'
export const logger = new TestLogger(PACKAGE_NAME)

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
  logger.log('Generating testnet payments accounts using faucet')
  const hotAccount = await generateTestnetAccount()
  await delay(1000)
  const depositAccount = await generateTestnetAccount()
  const config: AccountRipplePaymentsConfig = {
    hotAccount,
    depositAccount,
  }
  fs.mkdirSync(path.dirname(TEST_ACCOUNT_FILE), { recursive: true })
  fs.writeFileSync(TEST_ACCOUNT_FILE, JSON.stringify(config), { encoding: 'utf8' })
  return config
}

export async function setupTestnetPayments(): Promise<AccountRipplePayments> {
  let config: AccountRipplePaymentsConfig | undefined
  // Load saved testnet accounts
  if (fs.existsSync(TEST_ACCOUNT_FILE)) {
    const stringContents = fs.readFileSync(TEST_ACCOUNT_FILE, { encoding: 'utf8' })
    try {
      const jsonContents = JSON.parse(stringContents)
      config = assertType(AccountRipplePaymentsConfig, jsonContents)
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
  let rp = new AccountRipplePayments({
    ...DEFAULT_CONFIG,
    ...config,
  })
  await rp.init()
  // Make accounts still exist, testnet can be wiped
  try {
    await rp.getBalance(0)
    await rp.getBalance(1)
  } catch (e) {
    if (e.message.includes('Account not found')) {
      logger.warn('Cached testnet accounts have been reset, will regenerate')
      config = await generatePaymentsConfig()
      const rippleApi = rp.api
      rp = new AccountRipplePayments({
        ...DEFAULT_CONFIG,
        ...config,
      })
      rp.api = rippleApi
    }
  }
  return rp
}
