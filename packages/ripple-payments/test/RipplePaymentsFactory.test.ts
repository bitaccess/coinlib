import { RipplePaymentsFactory } from '#/RipplePaymentsFactory'
import { HdRipplePayments } from '#/HdRipplePayments'
import { AccountRipplePayments } from '#/AccountRipplePayments'
import { HdRipplePaymentsConfig, AccountRipplePaymentsConfig } from '#/types'

import { hdAccount } from './fixtures/accounts'

const { XPRV, PRIVATE_KEYS, PUBLIC_KEYS, ADDRESSES } = hdAccount

describe('RipplePaymentsFactory', () => {
  const factory = new RipplePaymentsFactory()
  it('should instantiate HdRipplePayments', () => {
    const config: HdRipplePaymentsConfig = {
      hdKey: XPRV,
    }
    expect(factory.forConfig(config)).toBeInstanceOf(HdRipplePayments)
  })
  it('should instantiate AccountRipplePayments from key pairs', () => {
    const config: AccountRipplePaymentsConfig = {
      hotAccount: {
        privateKey: PRIVATE_KEYS[0],
        publicKey: PUBLIC_KEYS[0],
      },
      depositAccount: {
        privateKey: PRIVATE_KEYS[1],
        publicKey: PUBLIC_KEYS[1],
      },
    }
    expect(factory.forConfig(config)).toBeInstanceOf(AccountRipplePayments)
  })
  it('should fail to instantiate unrecognized config', () => {
    expect(() => factory.forConfig({} as any)).toThrow()
  })
})
