import {
  BitcoinPaymentsFactory, HdBitcoinPayments, KeyPairBitcoinPayments,
  HdBitcoinPaymentsConfig, KeyPairBitcoinPaymentsConfig, BitcoinPaymentsUtils,
} from '../src'
import { PRIVATE_KEY } from './fixtures'

import { nativeSegwitAccount } from './fixtures/accounts'

const { xprv } = nativeSegwitAccount

describe('BitcoinPaymentsFactory', () => {
  const factory = new BitcoinPaymentsFactory()

  describe('newPayments', () => {
    it('should instantiate HdBitcoinPayments', () => {
      const config: HdBitcoinPaymentsConfig = {
        hdKey: xprv,
      }
      expect(factory.newPayments(config)).toBeInstanceOf(HdBitcoinPayments)
    })
    it('should instantiate KeyPairBitcoinPayments', () => {
      const config: KeyPairBitcoinPaymentsConfig = {
        keyPairs: [PRIVATE_KEY],
      }
      expect(factory.newPayments(config)).toBeInstanceOf(KeyPairBitcoinPayments)
    })
    it('should fail to instantiate unrecognized config', () => {
      expect(() => factory.newPayments({} as any)).toThrow()
    })
  })

  describe('newUtils', () => {
    it('should instantiate BitcoinPaymentsUtils', () => {
      expect(factory.newUtils({})).toBeInstanceOf(BitcoinPaymentsUtils)
    })

    it('should fail to instantiate null config', () => {
      expect(() => factory.newUtils(null as any)).toThrow('Invalid config')
    })
  })
})
