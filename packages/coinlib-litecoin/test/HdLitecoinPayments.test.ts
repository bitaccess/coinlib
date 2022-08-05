import { NetworkType } from '@bitaccess/coinlib-common'
import { HdLitecoinPayments, HdLitecoinPaymentsConfig, SinglesigAddressType, LitecoinAddressFormat } from '../src'
import { accountsByAddressType } from './fixtures'
import { logger } from './utils'
import { runHardcodedPublicKeyTests } from './helpers'

jest.setTimeout(30 * 1000)

const validAddressFormat = LitecoinAddressFormat.Modern

describe('HdLitecoinPayments', () => {
  describe('static', () => {
    it('should throw on invalid hdKey', () => {
      expect(() => new HdLitecoinPayments({ hdKey: 'invalid' })).toThrow()
    })
    it('should accept valid xprv as hdKey for testnet', () => {
      expect(
        new HdLitecoinPayments({
          network: NetworkType.Testnet,
          hdKey:
            'xprv9z7JUNTvAbwNTCJyuqz6rR9dCykBa5krATdkLD8VbXPSgxPSY3jLEqd422aDQiYW9irybEjAwusd9kb7TD7Uckjht9T6GQv7Akee6S6Mtmg',
        }),
      )
    })
  })

  for (const k in accountsByAddressType) {
    const addressType = k as SinglesigAddressType
    const accountFixture = accountsByAddressType[addressType]

    describe(addressType, () => {
      describe('hardcoded xpub', () => {
        const config: HdLitecoinPaymentsConfig = {
          hdKey: accountFixture.xpub,
          network: NetworkType.Mainnet,
          addressType,
          logger,
          validAddressFormat,
        }
        const payments = new HdLitecoinPayments(config)

        runHardcodedPublicKeyTests(payments, config, accountFixture)
      })

      describe('hardcoded xprv', () => {
        const config: HdLitecoinPaymentsConfig = {
          hdKey: accountFixture.xprv,
          network: NetworkType.Mainnet,
          addressType,
          logger,
          validAddressFormat,
        }
        const payments = new HdLitecoinPayments(config)

        runHardcodedPublicKeyTests(payments, config, accountFixture)
      })
    })
  }
})
