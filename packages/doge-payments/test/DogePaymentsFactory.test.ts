import {
  DogePaymentsFactory, HdDogePayments, KeyPairDogePayments, DogePaymentsConfig,
  HdDogePaymentsConfig, KeyPairDogePaymentsConfig, DogePaymentsUtils,
} from '../src'
import { PRIVATE_KEY } from './fixtures'

import { legacyAccount } from './fixtures/accounts'

const { xprv } = legacyAccount

describe('DogePaymentsFactory', () => {
  const factory = new DogePaymentsFactory()

  describe('newPayments', () => {
    it('should instantiate HdDogePayments', () => {
      const config: HdDogePaymentsConfig = {
        hdKey: xprv,
      }
      expect(factory.newPayments(config)).toBeInstanceOf(HdDogePayments)
    })
    it('should instantiate KeyPairDogePayments', () => {
      const config: KeyPairDogePaymentsConfig = {
        keyPairs: [PRIVATE_KEY],
      }
      expect(factory.newPayments(config)).toBeInstanceOf(KeyPairDogePayments)
    })
    it('should fail to instantiate unrecognized config', () => {
      expect(() => factory.newPayments({} as any)).toThrow()
    })
  })

  describe('newUtils', () => {
    it('should instantiate DogePaymentsUtils', () => {
      expect(factory.newUtils({})).toBeInstanceOf(DogePaymentsUtils)
    })

    it('should fail to instantiate null config', () => {
      expect(() => factory.newUtils(null as any)).toThrow('Invalid config')
    })
  })
})
