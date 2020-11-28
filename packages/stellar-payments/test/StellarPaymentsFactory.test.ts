import {
  StellarPaymentsFactory, HdStellarPayments, AccountStellarPayments,
  HdStellarPaymentsConfig, AccountStellarPaymentsConfig,
} from '../src'

import { hdAccount } from './fixtures/accounts'

const { SEED, ADDRESSES, SECRETS } = hdAccount

describe('StellarPaymentsFactory', () => {
  const factory = new StellarPaymentsFactory()
  it('should instantiate HdStellarPayments', () => {
    const config: HdStellarPaymentsConfig = {
      seed: SEED,
    }
    expect(factory.newPayments(config)).toBeInstanceOf(HdStellarPayments)
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
    expect(factory.newPayments(config)).toBeInstanceOf(AccountStellarPayments)
  })
  it('should fail to instantiate unrecognized config', () => {
    expect(() => factory.newPayments({} as any)).toThrow()
  })
})
