import fetch from 'node-fetch'
import util from 'util'
import path from 'path'
import fs from 'fs'
import { AccountRipplePayments } from '../src'
import { AccountRipplePaymentsConfig, RippleAccountConfig } from '../src/types'
import { assertType } from '@faast/ts-common'

const TESTNET_SERVER = 'wss://s.altnet.rippletest.net:51233'
const TEST_ACCOUNT_FILE = path.resolve(__dirname, 'keys/testnet.accounts.key')

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

async function delay(ms: number): Promise<void> {
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
  // Make sure we still have a balance, testnet can be wiped
  let rp = new AccountRipplePayments({
    server: TESTNET_SERVER,
    ...config,
  })
  await rp.setup()
  const hotWalletBalances = await rp.getBalance(0)
  const depositWalletBalances = await rp.getBalance(1)
  if (!hotWalletBalances.sweepable || !depositWalletBalances.sweepable) {
    console.warn(
      'Existing testnet accounts have insufficient balances, will regenerate' +
        `(${hotWalletBalances.confirmedBalance} XPR and ${depositWalletBalances.confirmedBalance} XRP)`,
    )
    config = await generatePaymentsConfig()
    rp = new AccountRipplePayments({
      server: TESTNET_SERVER,
      ...config,
    })
  }
  return rp
}
