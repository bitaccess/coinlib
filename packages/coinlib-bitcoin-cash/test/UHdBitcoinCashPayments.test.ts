import fs from 'fs'
import path from 'path'
import { NetworkType } from '@bitaccess/coinlib-common'
import {
  BitcoinCashAddressFormat,
  UHdBitcoinCashPayments,
  HdBitcoinCashPaymentsConfig,
  UHdBitcoinCashPaymentsConfig,
} from '../src'
import {
  hdAccount as accountFixture,
  seedAccount,
  seedAccountsXPrv,
} from './fixtures'
import { logger } from './utils'
import { runHardcodedPublicKeyTests } from './helper'

jest.setTimeout(30 * 1000)

const SECRET_XPRV_FILE = 'test/keys/mainnet.key'

const rootDir = path.resolve(__dirname, '..')
const secretXprvFilePath = path.resolve(rootDir, SECRET_XPRV_FILE)
let secretXprv = ''
if (fs.existsSync(secretXprvFilePath)) {
  secretXprv = fs
    .readFileSync(secretXprvFilePath)
    .toString('utf8')
    .trim()
  logger.log(`Loaded ${SECRET_XPRV_FILE}. Send and sweep tests enabled.`)
} else {
  logger.log(
    `File ${SECRET_XPRV_FILE} missing. Send and sweep e2e mainnet tests will be skipped. To enable them ask Dylan to share the file with you.`,
  )
}

describe('UHdBitcoinCashPayments', () => {
  describe('static', () => {
    it('should throw on invalid hdKey', () => {
      expect(() => new UHdBitcoinCashPayments({ logger, uniPubKey: 'invalid' })).toThrow()
    })
  })

  describe('hardcoded xpub', () => {
    const config: UHdBitcoinCashPaymentsConfig = {
      uniPubKey: accountFixture.xpub,
      network: NetworkType.Mainnet,
      logger,
      validAddressFormat: BitcoinCashAddressFormat.Cash,
    }
    const oldConfig: HdBitcoinCashPaymentsConfig = {
      hdKey: accountFixture.xpub,
      network: NetworkType.Mainnet,
      logger,
    }
    const payments = new UHdBitcoinCashPayments(config)

    runHardcodedPublicKeyTests(payments, oldConfig, accountFixture)
  })

  describe('hardcoded seed', () => {
    const config: UHdBitcoinCashPaymentsConfig = {
      seed: seedAccount.seed,
      derivationPath: seedAccount.derivationPath,
      network: NetworkType.Testnet,
      logger,
      validAddressFormat: BitcoinCashAddressFormat.Cash,
    }
    const oldConfig: HdBitcoinCashPaymentsConfig = {
      hdKey: seedAccountsXPrv,
      network: NetworkType.Testnet,
      logger,
    }
    const payments = new UHdBitcoinCashPayments(config)

    runHardcodedPublicKeyTests(payments, oldConfig, seedAccount)
  })
})
