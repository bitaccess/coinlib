import * as fs from 'fs'
import * as path from 'path'
import { NetworkType } from '@bitaccess/coinlib-common'
import { HdDogePayments, HdDogePaymentsConfig, SinglesigAddressType } from '../src'
import { accountsByAddressType, legacyAccount } from './fixtures'
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

describe('HdDogePayments', () => {
  describe('static', () => {
    it('should throw on invalid hdKey', () => {
      expect(() => new HdDogePayments({ hdKey: 'invalid' })).toThrow()
    })
  })

  for (const k in accountsByAddressType) {
    const addressType = k as SinglesigAddressType
    const accountFixture = legacyAccount

    describe(addressType, () => {
      describe('hardcoded xpub', () => {
        const config: HdDogePaymentsConfig = {
          hdKey: accountFixture.xpub,
          network: NetworkType.Mainnet,
          addressType,
          logger,
        }
        const payments = new HdDogePayments(config)

        runHardcodedPublicKeyTests(payments, config, accountFixture, logger)
      })

      describe('hardcoded xprv', () => {
        const config: HdDogePaymentsConfig = {
          hdKey: secretXprv,
          network: NetworkType.Mainnet,
          addressType,
          logger,
        }
        const payments = new HdDogePayments(config)

        runHardcodedPublicKeyTests(payments, config, accountFixture, logger)
      })
    })
  }
})