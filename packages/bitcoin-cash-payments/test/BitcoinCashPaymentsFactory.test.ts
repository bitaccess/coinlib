import {
  BitcoinCashPaymentsFactory, HdBitcoinCashPayments, KeyPairBitcoinCashPayments, BitcoinCashPaymentsConfig,
  HdBitcoinCashPaymentsConfig, KeyPairBitcoinCashPaymentsConfig, BitcoinCashPaymentsUtils,
} from '../src'
import { logger } from './utils'
import { PRIVATE_KEY } from './fixtures'
import { hdAccount } from './fixtures/accounts'

const { xprv } = hdAccount

describe('BitcoinCashPaymentsFactory', () => {
  const factory = new BitcoinCashPaymentsFactory()

  describe('newPayments', () => {
    it('should instantiate HdBitcoinCashPayments', () => {
      const config: HdBitcoinCashPaymentsConfig = {
        logger,
        hdKey: xprv,
      }
      expect(factory.newPayments(config)).toBeInstanceOf(HdBitcoinCashPayments)
    })
    it('should instantiate KeyPairBitcoinCashPayments', () => {
      const config: KeyPairBitcoinCashPaymentsConfig = {
        logger,
        keyPairs: [PRIVATE_KEY],
      }
      expect(factory.newPayments(config)).toBeInstanceOf(KeyPairBitcoinCashPayments)
    })
    it('should fail to instantiate unrecognized config', () => {
      expect(() => factory.newPayments({} as any)).toThrow()
    })
  })

  describe('newUtils', () => {
    it('should instantiate BitcoinCashPaymentsUtils', () => {
      expect(factory.newUtils({})).toBeInstanceOf(BitcoinCashPaymentsUtils)
    })

    it('should fail to instantiate null config', () => {
      expect(() => factory.newUtils(null as any)).toThrow('Invalid config')
    })
  })
})
