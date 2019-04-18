import { TronPaymentsFactory } from '#/TronPaymentsFactory'
import { HdTronPayments } from '#/HdTronPayments'
import { KeyPairTronPayments } from '#/KeyPairTronPayments'
import { HdTronPaymentsConfig, KeyPairTronPaymentsConfig } from '#/types'
import { TronPaymentsConfig } from '../src/types';

describe('TronPaymentsFactory', () => {
  const factory = new TronPaymentsFactory()
  it('should instantiate HdTronPayments', () => {
    const config: HdTronPaymentsConfig = {
      hdKey: 'xprv1234',
    }
    expect(factory.forConfig(config)).toBeInstanceOf(HdTronPayments)
  })
  it('should instantiate KeyPairTronPayments', () => {
    const config: KeyPairTronPaymentsConfig = {
      keyPairs: ['pkey1234', 'address1234'],
    }
    expect(factory.forConfig(config)).toBeInstanceOf(KeyPairTronPayments)
  })
  it('should fail to instantiate unrecognized config', () => {
    expect(() => factory.forConfig({} as TronPaymentsConfig)).toThrow()
  })
})
