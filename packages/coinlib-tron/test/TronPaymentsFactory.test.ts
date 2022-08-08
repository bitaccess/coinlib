import {
  TronPaymentsFactory,
  HdTronPayments,
  UHdTronPayments,
  KeyPairTronPayments,
  TronPaymentsConfig,
  HdTronPaymentsConfig,
  UHdTronPaymentsConfig,
  KeyPairTronPaymentsConfig,
  TronPaymentsUtils,
} from '../src'

import { hdAccount } from './fixtures/accounts'

const { SEED, XPRV, PRIVATE_KEYS, ADDRESSES } = hdAccount

describe('TronPaymentsFactory', () => {
  const factory = new TronPaymentsFactory()

  describe('newPayments', () => {
    it('should instantiate HdTronPayments', () => {
      const config: HdTronPaymentsConfig = {
        hdKey: XPRV,
      }
      expect(factory.newPayments(config)).toBeInstanceOf(HdTronPayments)
    })
    it('should instantiate UHdTronPayments', () => {
      const config: UHdTronPaymentsConfig = {
        seed: SEED,
      }
      expect(factory.newPayments(config)).toBeInstanceOf(UHdTronPayments)
    })
    it('should instantiate KeyPairTronPayments', () => {
      const config: KeyPairTronPaymentsConfig = {
        keyPairs: [PRIVATE_KEYS[0], ADDRESSES[0]],
      }
      expect(factory.newPayments(config)).toBeInstanceOf(KeyPairTronPayments)
    })
    it('should fail to instantiate unrecognized config', () => {
      expect(() => factory.newPayments({} as any)).toThrow()
    })
  })

  describe('newUtils', () => {
    it('should instantiate TronPaymentsUtils', () => {
      expect(factory.newUtils({})).toBeInstanceOf(TronPaymentsUtils)
    })

    it('should fail to instantiate null config', () => {
      expect(() => factory.newUtils(null as any)).toThrow('Invalid config')
    })
  })
})
