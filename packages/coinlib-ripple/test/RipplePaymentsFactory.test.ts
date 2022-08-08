import {
  RipplePaymentsFactory,
  HdRipplePayments,
  UHdRipplePayments,
  AccountRipplePayments,
  HdRipplePaymentsConfig,
  UHdRipplePaymentsConfig,
  AccountRipplePaymentsConfig,
  RipplePaymentsUtils,
  BaseRipplePaymentsConfig,
  RippleServerAPI,
  RippleBalanceMonitor,
} from '../src'

import { hdAccount } from './fixtures/accounts'
import { TestLogger } from './utils'

const { SEED, XPRV, PRIVATE_KEYS, PUBLIC_KEYS, ADDRESSES } = hdAccount

const logger = new TestLogger('ripple-payments')

const SERVER = 'wss://s1.ripple.com'
const HD_CONFIG: HdRipplePaymentsConfig = {
  logger,
  server: SERVER,
  hdKey: XPRV,
}
const UHD_CONFIG: UHdRipplePaymentsConfig = {
  logger,
  server: SERVER,
  seed: SEED,
}
const ACCOUNT_CONFIG: AccountRipplePaymentsConfig = {
  logger,
  server: SERVER,
  hotAccount: {
    privateKey: PRIVATE_KEYS[0],
    publicKey: PUBLIC_KEYS[0],
  },
  depositAccount: {
    privateKey: PRIVATE_KEYS[1],
    publicKey: PUBLIC_KEYS[1],
  },
}
const UTILS_CONFIG: BaseRipplePaymentsConfig = {
  logger,
  server: SERVER,
}
const BM_CONFIG: BaseRipplePaymentsConfig = {
  logger,
  server: SERVER,
}

describe('RipplePaymentsFactory', () => {
  let factory: RipplePaymentsFactory

  beforeEach(() => {
    factory = new RipplePaymentsFactory()
  })

  afterEach(async () => {
    // disconnect all connections
    await Promise.all(Object.values(factory.connectionManager.connections).map(connection => connection.disconnect()))
  })

  describe('newPayments', () => {
    it('should instantiate HdRipplePayments', () => {
      expect(factory.newPayments(HD_CONFIG)).toBeInstanceOf(HdRipplePayments)
    })
    it('should instantiate UHdRipplePayments', () => {
      expect(factory.newPayments(UHD_CONFIG)).toBeInstanceOf(UHdRipplePayments)
    })
    it('should instantiate AccountRipplePayments from key pairs', () => {
      expect(factory.newPayments(ACCOUNT_CONFIG)).toBeInstanceOf(AccountRipplePayments)
    })
    it('should fail to instantiate unrecognized config', () => {
      expect(() => factory.newPayments({} as any)).toThrow()
    })
  })

  describe('newUtils', () => {
    it('should instantiate RipplePaymentsUtils', () => {
      expect(factory.newUtils(UTILS_CONFIG)).toBeInstanceOf(RipplePaymentsUtils)
    })

    it('should fail to instantiate null config', () => {
      expect(() => factory.newUtils(null as any)).toThrow('Invalid config')
    })
  })

  describe('newBalanceMonitor', () => {
    it('should instantiate RippleBalanceMonitor', () => {
      expect(factory.newBalanceMonitor(BM_CONFIG)).toBeInstanceOf(RippleBalanceMonitor)
    })

    it('should fail to instantiate null config', () => {
      expect(() => factory.newUtils(null as any)).toThrow('Invalid config')
    })
  })

  describe('initConnected', () => {
    it('should instantiate all with same ripple API instance', async () => {
      const payments1 = await factory.initPayments(HD_CONFIG)
      const payments2 = await factory.initPayments(ACCOUNT_CONFIG)
      const payments3 = await factory.initPayments(UHD_CONFIG)
      const utils = await factory.initUtils(UTILS_CONFIG)
      const bm = await factory.initBalanceMonitor(BM_CONFIG)
      expect(payments1.api).toBeInstanceOf(RippleServerAPI)
      expect(payments1.api).toBe(payments2.api)
      expect(payments1.api).toBe(payments3.api)
      expect(payments1.api).toBe(utils.api)
      expect(utils.api).toBe(bm.api)
      expect(bm.api.isConnected()).toBe(true)
    })
  })
})
