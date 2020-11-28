import {
  TronPaymentsFactory, HdTronPayments, KeyPairTronPayments, TronPaymentsConfig,
  HdTronPaymentsConfig, KeyPairTronPaymentsConfig,
} from '../src'

import { hdAccount } from './fixtures/accounts'

const { XPRV, PRIVATE_KEYS, ADDRESSES } = hdAccount

describe('TronPaymentsFactory', () => {
  const factory = new TronPaymentsFactory()
  it('should instantiate HdTronPayments', () => {
    const config: HdTronPaymentsConfig = {
      hdKey: XPRV,
    }
    expect(factory.newPayments(config)).toBeInstanceOf(HdTronPayments)
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
