import { TronPaymentsFactory } from '#/TronPaymentsFactory'
import { HdTronPayments } from '#/HdTronPayments'
import { KeyPairTronPayments } from '#/KeyPairTronPayments'
import { HdTronPaymentsConfig, KeyPairTronPaymentsConfig } from '#/types'
import { TronPaymentsConfig } from '../src/types'

import { hdAccount } from './fixtures/accounts'

const { XPRV, PRIVATE_KEYS, ADDRESSES } = hdAccount

describe('TronPaymentsFactory', () => {
  const factory = new TronPaymentsFactory()
  it('should instantiate HdTronPayments', () => {
    const config: HdTronPaymentsConfig = {
      hdKey: XPRV,
    }
    expect(factory.forConfig(config)).toBeInstanceOf(HdTronPayments)
  })
  it('should instantiate KeyPairTronPayments', () => {
    const config: KeyPairTronPaymentsConfig = {
      keyPairs: [PRIVATE_KEYS[0], ADDRESSES[0]],
    }
    expect(factory.forConfig(config)).toBeInstanceOf(KeyPairTronPayments)
  })
  it('should fail to instantiate unrecognized config', () => {
    expect(() => factory.forConfig({} as TronPaymentsConfig)).toThrow()
  })
})
