import fs from 'fs'
import path from 'path'
import { NetworkType } from '@bitaccess/coinlib-common'
import { UHdDogePayments, UHdDogePaymentsConfig, HdDogePaymentsConfig, SinglesigAddressType } from '../src'
import { seedAccountsByAddressType, seedLegacyAccount, seedLegacyAccountXPrv } from './fixtures'
import { runHardcodedPublicKeyTests } from './helpers'
import { TestLogger } from '../../../common/testUtils'

const logger = new TestLogger(__filename)
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

describe('UHdDogePayments', () => {
  describe('static', () => {
    it('should throw on invalid uniPubKey', () => {
      expect(() => new UHdDogePayments({ uniPubKey: 'invalid' })).toThrow()
    })
  })

  for (const k in seedAccountsByAddressType) {
    const addressType = k as SinglesigAddressType
    const accountFixture = seedLegacyAccount

    describe(addressType, () => {
      describe('hardcoded xpub', () => {
        const config: UHdDogePaymentsConfig = {
          uniPubKey: accountFixture.xpub,
          network: NetworkType.Mainnet,
          addressType,
          logger,
        }
        const oldConfig: HdDogePaymentsConfig = {
          hdKey: accountFixture.xpub,
          network: NetworkType.Mainnet,
          addressType,
          logger,
        }
        const payments = new UHdDogePayments(config)
        runHardcodedPublicKeyTests(payments, oldConfig, accountFixture, logger)
      })

      describe('hardcoded xprv', () => {
        const config: UHdDogePaymentsConfig = {
          seed: accountFixture.seed,
          uniPubKey: accountFixture.xpub,
          network: NetworkType.Mainnet,
          addressType,
          logger,
        }
        const oldConfig: HdDogePaymentsConfig = {
          hdKey: seedLegacyAccountXPrv,
          network: NetworkType.Mainnet,
          addressType,
          logger,
        }
        const payments = new UHdDogePayments(config)
        runHardcodedPublicKeyTests(payments, oldConfig, accountFixture, logger)
      })
    })
  }
})
