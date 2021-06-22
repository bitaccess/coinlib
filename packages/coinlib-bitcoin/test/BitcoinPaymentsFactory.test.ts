import {
  BitcoinPaymentsFactory,
  HdBitcoinPayments,
  KeyPairBitcoinPayments,
  HdBitcoinPaymentsConfig,
  KeyPairBitcoinPaymentsConfig,
  BitcoinPaymentsUtils,
  BitcoinBalanceMonitor,
  DEFAULT_MAINNET_SERVER,
  BitcoinBalanceMonitorConfig,
  BitcoinPaymentsUtilsConfig,
  bitcoinish
} from '../src'
import { PRIVATE_KEY } from './fixtures'

import { nativeSegwitAccount } from './fixtures/accounts'
import { logger } from './utils'

const { xprv } = nativeSegwitAccount

const SERVER = DEFAULT_MAINNET_SERVER
const HD_CONFIG: HdBitcoinPaymentsConfig = {
  logger,
  server: SERVER,
  hdKey: xprv,
}
const KEYPAIR_CONFIG: KeyPairBitcoinPaymentsConfig = {
  logger,
  server: SERVER,
  keyPairs: [PRIVATE_KEY],
}
const UTILS_CONFIG: BitcoinPaymentsUtilsConfig = {
  logger,
  server: SERVER,
}
const BM_CONFIG: BitcoinBalanceMonitorConfig = {
  logger,
  server: SERVER,
}

describe('BitcoinPaymentsFactory', () => {
  let factory: BitcoinPaymentsFactory

  beforeEach(() => {
    factory = new BitcoinPaymentsFactory()
  })

  afterEach(async () => {
    // disconnect all connections
    await Promise.all(Object.values(factory.connectionManager.connections).map((connection) => connection.disconnect()))
  })

  describe('newPayments', () => {
    it('should instantiate HdBitcoinPayments', () => {
      expect(factory.newPayments(HD_CONFIG)).toBeInstanceOf(HdBitcoinPayments)
    })
    it('should instantiate KeyPairBitcoinPayments', () => {
      expect(factory.newPayments(KEYPAIR_CONFIG)).toBeInstanceOf(KeyPairBitcoinPayments)
    })
    it('should fail to instantiate unrecognized config', () => {
      expect(() => factory.newPayments({} as any)).toThrow()
    })
  })

  describe('newUtils', () => {
    it('should instantiate BitcoinPaymentsUtils', () => {
      expect(factory.newUtils(UTILS_CONFIG)).toBeInstanceOf(BitcoinPaymentsUtils)
    })

    it('should fail to instantiate null config', () => {
      expect(() => factory.newUtils(null as any)).toThrow('Invalid config')
    })
  })

  describe('newBalanceMonitor', () => {
    it('should instantiate BitcoinBalanceMonitor', () => {
      expect(factory.newBalanceMonitor(BM_CONFIG)).toBeInstanceOf(BitcoinBalanceMonitor)
    })

    it('should fail to instantiate null config', () => {
      expect(() => factory.newUtils(null as any)).toThrow('Invalid config')
    })
  })

  describe('initConnected', () => {
    it('should instantiate all with same blockbook API instance', async () => {
      const payments1 = await factory.initPayments(HD_CONFIG)
      const payments2 = await factory.initPayments(KEYPAIR_CONFIG)
      const utils = await factory.initUtils(UTILS_CONFIG)
      const bm = await factory.initBalanceMonitor(BM_CONFIG)
      expect(payments1.api).toBeInstanceOf(bitcoinish.BlockbookServerAPI)
      expect(payments1.api).toBe(payments2.api)
      expect(payments2.api).toBe(utils.api)
      expect(utils.api).toBe(bm.api)
      expect(bm.api.wsConnected).toBe(true)
    })
  })
})
