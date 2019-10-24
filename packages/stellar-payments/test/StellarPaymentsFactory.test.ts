import { StellarPaymentsFactory } from '#/StellarPaymentsFactory'
import { HdStellarPayments } from '#/HdStellarPayments'
import { AccountStellarPayments } from '#/AccountStellarPayments'
import { HdStellarPaymentsConfig, AccountStellarPaymentsConfig } from '#/types'

import { hdAccount } from './fixtures/accounts'

const { SEED, ADDRESSES, SECRETS } = hdAccount

describe('StellarPaymentsFactory', () => {
  const factory = new StellarPaymentsFactory()
  it('should instantiate HdStellarPayments', () => {
    const config: HdStellarPaymentsConfig = {
      seed: SEED,
    }
    expect(factory.forConfig(config)).toBeInstanceOf(HdStellarPayments)
  })
  it('should instantiate AccountStellarPayments from key pairs', () => {
    const config: AccountStellarPaymentsConfig = {
      hotAccount: {
        address: ADDRESSES[0],
        secret: SECRETS[0],
      },
      depositAccount: {
        address: ADDRESSES[1],
        secret: SECRETS[1],
      },
    }
    expect(factory.forConfig(config)).toBeInstanceOf(AccountStellarPayments)
  })
  it('should fail to instantiate unrecognized config', () => {
    expect(() => factory.forConfig({} as any)).toThrow()
  })
})
