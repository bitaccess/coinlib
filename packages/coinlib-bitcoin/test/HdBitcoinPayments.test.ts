import { NetworkType } from '@bitaccess/coinlib-common'
import { HdBitcoinPayments, HdBitcoinPaymentsConfig, AddressType, SinglesigAddressType } from '../src'
import { accountsByAddressType } from './fixtures'
import { logger } from './utils'
import { runBuildPaymentTxTests, runHardcodedPublicKeyTests } from './helper'

jest.setTimeout(30 * 1000)

describe('HdBitcoinPayments', () => {
  describe('static', () => {
    it('should throw on invalid hdKey', () => {
      expect(() => new HdBitcoinPayments({ hdKey: 'invalid' })).toThrow()
    })
  })

  describe('buildPaymentTx', () => {
    const account = accountsByAddressType.p2wpkh
    const minChange = '0.01'
    const targetUtxoPoolSize = 4
    const payments = new HdBitcoinPayments({
      hdKey: account.xpub,
      addressType: AddressType.SegwitNative,
      logger,
      minChange,
      targetUtxoPoolSize,
    })
    runBuildPaymentTxTests(payments, account)
  })

  for (const k in accountsByAddressType) {
    const addressType = k as SinglesigAddressType
    const accountFixture = accountsByAddressType[addressType]

    describe(addressType, () => {
      describe('hardcoded xpub', () => {
        const config: HdBitcoinPaymentsConfig = {
          hdKey: accountFixture.xpub,
          network: NetworkType.Mainnet,
          addressType,
          logger,
        }
        const payments = new HdBitcoinPayments(config)
        runHardcodedPublicKeyTests(payments, config, accountFixture)
      })

      describe('hardcoded xprv', () => {
        const config: HdBitcoinPaymentsConfig = {
          hdKey: accountFixture.xprv,
          network: NetworkType.Mainnet,
          addressType,
          logger,
        }
        const payments = new HdBitcoinPayments(config)
        runHardcodedPublicKeyTests(payments, config, accountFixture)
      })
    })
  }
  
})
