import { NetworkType } from '@bitaccess/coinlib-common'

import {
  UHdBitcoinPayments,
  HdBitcoinPaymentsConfig,
  UHdBitcoinPaymentsConfig,
  AddressType,
  SinglesigAddressType,
} from '../src'
import { seedAccountsByAddressType, seedAccountsXPrv } from './fixtures'
import { runBuildPaymentTxTests, runHardcodedPublicKeyTests } from './helper'
import { logger } from './utils'

jest.setTimeout(30 * 1000)

describe('UHdBitcoinPayments', () => {
  describe('static', () => {
    it('should throw on invalid uniPubKey', () => {
      expect(() => new UHdBitcoinPayments({ uniPubKey: 'invalid' })).toThrow()
    })
  })

  describe('buildPaymentTx', () => {
    const account = seedAccountsByAddressType.p2wpkh
    const minChange = '0.01'
    const targetUtxoPoolSize = 4
    const payments = new UHdBitcoinPayments({
      uniPubKey: account.xpub,
      addressType: AddressType.SegwitNative,
      logger,
      minChange,
      targetUtxoPoolSize,
    })
    runBuildPaymentTxTests(payments, account)
  })

  for (const k in seedAccountsByAddressType) {
    const addressType = k as SinglesigAddressType
    const accountFixture = seedAccountsByAddressType[addressType]

    describe(addressType, () => {
      describe('hardcoded xpub', () => {
        const config: UHdBitcoinPaymentsConfig = {
          uniPubKey: accountFixture.xpub,
          network: NetworkType.Mainnet,
          addressType,
          logger,
        }
        const oldConfig: HdBitcoinPaymentsConfig = {
          hdKey: accountFixture.xpub,
          network: NetworkType.Mainnet,
          addressType,
          logger,
        }
        const payments = new UHdBitcoinPayments(config)

        runHardcodedPublicKeyTests(payments, oldConfig, accountFixture)
      })

      describe('hardcoded xprv', () => {
        const config: UHdBitcoinPaymentsConfig = {
          seed: accountFixture.seed,
          network: NetworkType.Mainnet,
          addressType,
          logger,
        }
        const oldConfig: HdBitcoinPaymentsConfig = {
          hdKey: seedAccountsXPrv,
          network: NetworkType.Mainnet,
          addressType,
          logger,
        }
        const payments = new UHdBitcoinPayments(config)
        runHardcodedPublicKeyTests(payments, oldConfig, accountFixture)
      })
    })
  }
})
