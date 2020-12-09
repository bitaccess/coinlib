import {
  LitecoinPaymentsFactory, HdLitecoinPayments, KeyPairLitecoinPayments, LitecoinPaymentsConfig,
  HdLitecoinPaymentsConfig, KeyPairLitecoinPaymentsConfig, LitecoinPaymentsUtils,
} from '../src'

import { legacyAccount } from './fixtures/accounts'
import { PRIVATE_KEY } from './fixtures/bip44'

const { xprv } = legacyAccount

describe('LitecoinPaymentsFactory', () => {
  const factory = new LitecoinPaymentsFactory()

  describe('newPayments', () => {
    it('should instantiate HdLitecoinPayments', () => {
      const config: HdLitecoinPaymentsConfig = {
        hdKey: xprv,
      }
      expect(factory.newPayments(config)).toBeInstanceOf(HdLitecoinPayments)
    })
    it('should instantiate KeyPairLitecoinPayments', () => {
      const config: KeyPairLitecoinPaymentsConfig = {
        keyPairs: [PRIVATE_KEY],
      }
      expect(factory.newPayments(config)).toBeInstanceOf(KeyPairLitecoinPayments)
    })
    it('should fail to instantiate unrecognized config', () => {
      expect(() => factory.newPayments({} as any)).toThrow()
    })
  })

  describe('newUtils', () => {
    it('should instantiate LitecoinPaymentsUtils', () => {
      expect(factory.newUtils({})).toBeInstanceOf(LitecoinPaymentsUtils)
    })

    it('should fail to instantiate null config', () => {
      expect(() => factory.newUtils(null as any)).toThrow('Invalid config')
    })
  })
})
