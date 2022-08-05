import fs from 'fs'
import path from 'path'
import { NetworkType, FeeRateType } from '@bitaccess/coinlib-common'
import { BitcoinCashAddressFormat, HdBitcoinCashPayments, HdBitcoinCashPaymentsConfig } from '../src'

import { EXTERNAL_ADDRESS, AccountFixture, hdAccount as accountFixture, ADDRESS_LEGACY } from './fixtures'
import { logger, makeUtxos, makeOutputs, expectUtxosEqual } from './utils'
import { toBigNumber } from '@faast/ts-common'
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

describe('HdBitcoinCashPayments', () => {
  describe('static', () => {
    it('should throw on invalid hdKey', () => {
      expect(() => new HdBitcoinCashPayments({ logger, hdKey: 'invalid' })).toThrow()
    })
  })

  describe('hardcoded xpub', () => {
    const config: HdBitcoinCashPaymentsConfig = {
      hdKey: accountFixture.xpub,
      network: NetworkType.Mainnet,
      logger,
      validAddressFormat: BitcoinCashAddressFormat.Cash,
    }
    const payments = new HdBitcoinCashPayments(config)

    runHardcodedPublicKeyTests(payments, config, accountFixture)
  })

  describe('hardcoded xprv', () => {
    const config: HdBitcoinCashPaymentsConfig = {
      hdKey: secretXprv,
      network: NetworkType.Mainnet,
      logger,
      validAddressFormat: BitcoinCashAddressFormat.Cash,
    }
    const payments = new HdBitcoinCashPayments(config)

    runHardcodedPublicKeyTests(payments, config, accountFixture)
  })
})


