import {
  BitcoinCashPaymentsFactory,
  HdBitcoinCashPayments,
  KeyPairBitcoinCashPayments,
  HdBitcoinCashPaymentsConfig,
  KeyPairBitcoinCashPaymentsConfig,
  BitcoinCashPaymentsUtils,
  DEFAULT_MAINNET_SERVER,
  BitcoinCashPaymentsUtilsConfig,
  BitcoinCashBalanceMonitorConfig,
  BitcoinCashBalanceMonitor,
  bitcoinish,
} from '../src'
import { logger } from './utils'
import { PRIVATE_KEY } from './fixtures'
import { hdAccount } from './fixtures/accounts'

const { xprv } = hdAccount

const SERVER = DEFAULT_MAINNET_SERVER
const HD_CONFIG: HdBitcoinCashPaymentsConfig = {
  logger,
  server: SERVER,
  hdKey: xprv,
}
const KEYPAIR_CONFIG: KeyPairBitcoinCashPaymentsConfig = {
  logger,
  server: SERVER,
  keyPairs: [PRIVATE_KEY],
}
const UTILS_CONFIG: BitcoinCashPaymentsUtilsConfig = {
  logger,
  server: SERVER,
}
const BM_CONFIG: BitcoinCashBalanceMonitorConfig = {
  logger,
  server: SERVER,
}

describe('BitcoinCashPaymentsFactory', () => {
  let factory: BitcoinCashPaymentsFactory

  beforeEach(() => {
    factory = new BitcoinCashPaymentsFactory()
  })

  afterEach(async () => {
    // disconnect all connections
    await Promise.all(Object.values(factory.connectionManager.connections).map((connection) => connection.disconnect()))
  })

  describe('newPayments', () => {
    it('should instantiate HdBitcoinCashPayments', () => {
      const config: HdBitcoinCashPaymentsConfig = {
        logger,
        hdKey: xprv,
      }
      expect(factory.newPayments(config)).toBeInstanceOf(HdBitcoinCashPayments)
    })
    it('should instantiate KeyPairBitcoinCashPayments', () => {
      const config: KeyPairBitcoinCashPaymentsConfig = {
        logger,
        keyPairs: [PRIVATE_KEY],
      }
      expect(factory.newPayments(config)).toBeInstanceOf(KeyPairBitcoinCashPayments)
    })
    it('should fail to instantiate unrecognized config', () => {
      expect(() => factory.newPayments({} as any)).toThrow()
    })
  })

  describe('newUtils', () => {
    it('should instantiate BitcoinCashPaymentsUtils', () => {
      expect(factory.newUtils({})).toBeInstanceOf(BitcoinCashPaymentsUtils)
    })

    it('should fail to instantiate null config', () => {
      expect(() => factory.newUtils(null as any)).toThrow('Invalid config')
    })
  })

  describe('newBalanceMonitor', () => {
    it('should instantiate BitcoinCashBalanceMonitor', () => {
      expect(factory.newBalanceMonitor(BM_CONFIG)).toBeInstanceOf(BitcoinCashBalanceMonitor)
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
