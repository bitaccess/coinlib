import {
  DogePaymentsFactory,
  HdDogePayments,
  KeyPairDogePayments,
  HdDogePaymentsConfig,
  KeyPairDogePaymentsConfig,
  MultisigDogePayments,
  MultisigDogePaymentsConfig,
  DogePaymentsUtils,
  DogeBalanceMonitor,
  DEFAULT_MAINNET_SERVER,
  DogePaymentsUtilsConfig,
  DogeBalanceMonitorConfig,
  bitcoinish,
} from '../src'
import { PRIVATE_KEY } from './fixtures'

import { legacyAccount } from './fixtures/accounts'
import { logger } from './utils'

const { xprv } = legacyAccount

const SERVER = DEFAULT_MAINNET_SERVER
const HD_CONFIG: HdDogePaymentsConfig = {
  logger,
  server: SERVER,
  hdKey: xprv,
}
const KEYPAIR_CONFIG: KeyPairDogePaymentsConfig = {
  logger,
  server: SERVER,
  keyPairs: [PRIVATE_KEY],
}
const MULTISIG_CONFIG: MultisigDogePaymentsConfig = {
  m:2,
  logger,
  server: SERVER,
  signers: [
    HD_CONFIG,
    KEYPAIR_CONFIG
  ],
}
const UTILS_CONFIG: DogePaymentsUtilsConfig = {
  logger,
  server: SERVER,
}
const BM_CONFIG: DogeBalanceMonitorConfig = {
  logger,
  server: SERVER,
}

describe('DogePaymentsFactory', () => {
  let factory: DogePaymentsFactory

  beforeEach(() => {
    factory = new DogePaymentsFactory()
  })

  afterEach(async () => {
    // disconnect all connections
    await Promise.all(Object.values(factory.connectionManager.connections).map((connection) => connection.disconnect()))
  })

  describe('newPayments', () => {
    it('should instantiate HdDogePayments', () => {
      expect(factory.newPayments(HD_CONFIG)).toBeInstanceOf(HdDogePayments)
    })
    it('should instantiate KeyPairDogePayments', () => {
      expect(factory.newPayments(KEYPAIR_CONFIG)).toBeInstanceOf(KeyPairDogePayments)
    })
    it('should instantiate multisigDogePayments', () => {
      const multiSigPayment = factory.newPayments(MULTISIG_CONFIG)
      expect(multiSigPayment).toBeInstanceOf(MultisigDogePayments)
    })
    it('should fail to instantiate unrecognized config', () => {
      expect(() => factory.newPayments({} as any)).toThrow()
    })
  })

  describe('newUtils', () => {
    it('should instantiate DogePaymentsUtils', () => {
      expect(factory.newUtils(UTILS_CONFIG)).toBeInstanceOf(DogePaymentsUtils)
    })

    it('should fail to instantiate null config', () => {
      expect(() => factory.newUtils(null as any)).toThrow('Invalid config')
    })
  })

  describe('newBalanceMonitor', () => {
    it('should instantiate DogeBalanceMonitor', () => {
      expect(factory.newBalanceMonitor(BM_CONFIG)).toBeInstanceOf(DogeBalanceMonitor)
    })

    it('should fail to instantiate null config', () => {
      expect(() => factory.newUtils(null as any)).toThrow('Invalid config')
    })
  })

  describe('initConnected', () => {
    it('should instantiate all with same blockbook API instance', async () => {
      const payments1 = await factory.initPayments(HD_CONFIG)
      const payments2 = await factory.initPayments(KEYPAIR_CONFIG)
      const payments3 = await factory.initPayments(MULTISIG_CONFIG)
      const utils = await factory.initUtils(UTILS_CONFIG)
      const bm = await factory.initBalanceMonitor(BM_CONFIG)
      expect(payments1.api).toBeInstanceOf(bitcoinish.BlockbookServerAPI)
      expect(payments1.api).toBe(payments2.api)
      expect(payments1.api).toBe(payments3.api)
      expect(payments2.api).toBe(utils.api)
      expect(utils.api).toBe(bm.api)
      expect(bm.api.wsConnected).toBe(true)
    })
  })
})
