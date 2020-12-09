import {
  StellarPaymentsFactory, HdStellarPayments, AccountStellarPayments,
  HdStellarPaymentsConfig, AccountStellarPaymentsConfig, BaseStellarPaymentsConfig, StellarBalanceMonitorConfig, StellarPaymentsUtils, StellarBalanceMonitor, StellarServerAPI,
} from '../src'

import { hdAccount } from './fixtures/accounts'
import { TestLogger } from './utils'

const { SEED, ADDRESSES, SECRETS } = hdAccount

const logger = new TestLogger('stellar-payments')

const SERVER = 'https://horizon.stellar.org'
const HD_CONFIG: HdStellarPaymentsConfig = {
  logger,
  server: SERVER,
  seed: SEED,
}
const ACCOUNT_CONFIG: AccountStellarPaymentsConfig = {
  logger,
  server: SERVER,
  hotAccount: {
    address: ADDRESSES[0],
    secret: SECRETS[0],
  },
  depositAccount: {
    address: ADDRESSES[1],
    secret: SECRETS[1],
  },
}
const UTILS_CONFIG: BaseStellarPaymentsConfig = {
  logger,
  server: SERVER,
}
const BM_CONFIG: StellarBalanceMonitorConfig = {
  logger,
  server: SERVER,
}

describe('StellarPaymentsFactory', () => {
  const factory = new StellarPaymentsFactory()

  describe('newPayments', () => {
    it('should instantiate HdStellarPayments', () => {
      expect(factory.newPayments(HD_CONFIG)).toBeInstanceOf(HdStellarPayments)
    })
    it('should instantiate AccountStellarPayments from key pairs', () => {
      expect(factory.newPayments(ACCOUNT_CONFIG)).toBeInstanceOf(AccountStellarPayments)
    })
    it('should fail to instantiate unrecognized config', () => {
      expect(() => factory.newPayments({} as any)).toThrow()
    })
  })

  describe('newUtils', () => {
    it('should instantiate StellarPaymentsUtils', () => {
      expect(factory.newUtils(UTILS_CONFIG)).toBeInstanceOf(StellarPaymentsUtils)
    })

    it('should fail to instantiate null config', () => {
      expect(() => factory.newUtils(null as any)).toThrow('Invalid config')
    })
  })

  describe('newBalanceMonitor', () => {
    it('should instantiate StellarBalanceMonitor', () => {
      expect(factory.newBalanceMonitor(BM_CONFIG)).toBeInstanceOf(StellarBalanceMonitor)
    })

    it('should fail to instantiate null config', () => {
      expect(() => factory.newUtils(null as any)).toThrow('Invalid config')
    })
  })

  describe('initConnected', () => {
    it('should instantiate all with same ripple API instance', async () => {
      const payments1 = await factory.initPayments(HD_CONFIG)
      const payments2 = await factory.initPayments(ACCOUNT_CONFIG)
      const utils = await factory.initUtils(UTILS_CONFIG)
      const bm = await factory.initBalanceMonitor(BM_CONFIG)
      expect(payments1.api).toBeInstanceOf(StellarServerAPI)
      expect(payments1.api).toBe(payments2.api)
      expect(payments2.api).toBe(utils.api)
      expect(utils.api).toBe(bm.api)
    })
  })
})
