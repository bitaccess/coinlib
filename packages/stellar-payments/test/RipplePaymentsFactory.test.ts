import { StellarPaymentsFactory } from '#/StellarPaymentsFactory'
import { HdStellarPayments } from '#/HdStellarPayments'
import { AccountStellarPayments } from '#/AccountStellarPayments'
import { HdStellarPaymentsConfig, AccountStellarPaymentsConfig } from '#/types'

import { hdAccount } from './fixtures/accounts'

const { XPRV, PRIVATE_KEYS, PUBLIC_KEYS, ADDRESSES } = hdAccount

describe('StellarPaymentsFactory', () => {
  const factory = new StellarPaymentsFactory()
  it('should instantiate HdStellarPayments', () => {
    const config: HdStellarPaymentsConfig = {
      hdKey: XPRV,
    }
    expect(factory.forConfig(config)).toBeInstanceOf(HdStellarPayments)
  })
  it('should instantiate AccountStellarPayments from key pairs', () => {
    const config: AccountStellarPaymentsConfig = {
      hotAccount: {
        privateKey: PRIVATE_KEYS[0],
        publicKey: PUBLIC_KEYS[0],
      },
      depositAccount: {
        privateKey: PRIVATE_KEYS[1],
        publicKey: PUBLIC_KEYS[1],
      },
    }
    expect(factory.forConfig(config)).toBeInstanceOf(AccountStellarPayments)
  })
  it('should fail to instantiate unrecognized config', () => {
    expect(() => factory.forConfig({} as any)).toThrow()
  })
})
