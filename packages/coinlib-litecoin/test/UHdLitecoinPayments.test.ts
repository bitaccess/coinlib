import { NetworkType } from '@bitaccess/coinlib-common'
import {
  UHdLitecoinPayments,
  HdLitecoinPaymentsConfig,
  UHdLitecoinPaymentsConfig,
  SinglesigAddressType,
  LitecoinAddressFormat,
} from '../src'
import { seedAccountsByAddressType, seedAccountsXPrv } from './fixtures'
import { logger } from './utils'
import { runHardcodedPublicKeyTests } from './helpers'

jest.setTimeout(30 * 1000)

const validAddressFormat = LitecoinAddressFormat.Modern

describe('UHdLitecoinPayments', () => {
  describe('static', () => {
    it('should throw on invalid uniPubKey', () => {
      expect(() => new UHdLitecoinPayments({ uniPubKey: 'invalid' })).toThrow()
    })
    it('should accept valid xprv as uniPubKey for testnet', () => {
      expect(
        new UHdLitecoinPayments({
          network: NetworkType.Testnet,
          uniPubKey:
            'xprv9z7JUNTvAbwNTCJyuqz6rR9dCykBa5krATdkLD8VbXPSgxPSY3jLEqd422aDQiYW9irybEjAwusd9kb7TD7Uckjht9T6GQv7Akee6S6Mtmg',
        }),
      )
    })
  })

  for (const k in seedAccountsByAddressType) {
    const addressType = k as SinglesigAddressType
    const accountFixture = seedAccountsByAddressType[addressType]

    describe(addressType, () => {
      describe('hardcoded xpub', () => {
        const config: UHdLitecoinPaymentsConfig = {
          uniPubKey: accountFixture.xpub,
          network: NetworkType.Mainnet,
          addressType,
          logger,
          validAddressFormat,
        }
        const oldConfig: HdLitecoinPaymentsConfig = {
          hdKey: accountFixture.xpub,
          network: NetworkType.Mainnet,
          addressType,
          logger,
        }
        const payments = new UHdLitecoinPayments(config)

        runHardcodedPublicKeyTests(payments, oldConfig, accountFixture)
      })

      describe('hardcoded xprv', () => {
        const config: UHdLitecoinPaymentsConfig = {
          seed: accountFixture.seed,
          network: NetworkType.Mainnet,
          addressType,
          logger,
          validAddressFormat,
        }
        const oldConfig: HdLitecoinPaymentsConfig = {
          hdKey: seedAccountsXPrv,
          network: NetworkType.Mainnet,
          addressType,
          logger,
        }
        const payments = new UHdLitecoinPayments(config)

        runHardcodedPublicKeyTests(payments, oldConfig, accountFixture)
      })
    })
  }
})
