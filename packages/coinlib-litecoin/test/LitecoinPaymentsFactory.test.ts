import {
  LitecoinPaymentsFactory,
  HdLitecoinPayments,
  KeyPairLitecoinPayments,
  HdLitecoinPaymentsConfig,
  KeyPairLitecoinPaymentsConfig,
  MultisigLitecoinPayments,
  MultisigLitecoinPaymentsConfig,
  LitecoinPaymentsUtils,
  DEFAULT_MAINNET_SERVER,
  LitecoinPaymentsUtilsConfig,
  LitecoinBalanceMonitorConfig,
  LitecoinBalanceMonitor,
  bitcoinish,
} from '../src'

import { legacyAccount } from './fixtures/accounts'
import { PRIVATE_KEY } from './fixtures/bip44'
import { logger } from './utils'

const { xprv } = legacyAccount

const SERVER = DEFAULT_MAINNET_SERVER
const HD_CONFIG: HdLitecoinPaymentsConfig = {
  logger,
  server: SERVER,
  hdKey: xprv,
}
const KEYPAIR_CONFIG: KeyPairLitecoinPaymentsConfig = {
  logger,
  server: SERVER,
  keyPairs: [PRIVATE_KEY],
}
const MULTISIG_CONFIG: MultisigLitecoinPaymentsConfig = {
  m: 2,
  logger,
  server: SERVER,
  signers: [
    HD_CONFIG,
    KEYPAIR_CONFIG,
  ],
}
const UTILS_CONFIG: LitecoinPaymentsUtilsConfig = {
  logger,
  server: SERVER,
}
const BM_CONFIG: LitecoinBalanceMonitorConfig = {
  logger,
  server: SERVER,
}

describe('LitecoinPaymentsFactory', () => {
  let factory: LitecoinPaymentsFactory

  beforeEach(() => {
    factory = new LitecoinPaymentsFactory()
  })

  afterEach(async () => {
    // disconnect all connections
    await Promise.all(Object.values(factory.connectionManager.connections).map((connection) => connection.disconnect()))
  })

  describe('newPayments', () => {
    it('should instantiate HdLitecoinPayments', () => {
      const config: HdLitecoinPaymentsConfig = {
        hdKey: xprv,
      }
      expect(factory.newPayments(config)).toBeInstanceOf(HdLitecoinPayments)
    })
    it('should instantiate KeyPairLitecoinPayments', () => {
      const config: KeyPairLitecoinPaymentsConfig = {
        keyPairs: [PRIVATE_KEY],
      }
      expect(factory.newPayments(config)).toBeInstanceOf(KeyPairLitecoinPayments)
    })
    it('should instantiate MultisigLitecoinPayments', () => {
      const multiSigPayment = factory.newPayments(MULTISIG_CONFIG)
      expect(multiSigPayment).toBeInstanceOf(MultisigLitecoinPayments)
    })
    it('should fail to instantiate unrecognized config', () => {
      expect(() => factory.newPayments({} as any)).toThrow()
    })
  })

  describe('newUtils', () => {
    it('should instantiate LitecoinPaymentsUtils', () => {
      expect(factory.newUtils({})).toBeInstanceOf(LitecoinPaymentsUtils)
    })

    it('should fail to instantiate null config', () => {
      expect(() => factory.newUtils(null as any)).toThrow('Invalid config')
    })
  })

  describe('newBalanceMonitor', () => {
    it('should instantiate LitecoinBalanceMonitor', () => {
      expect(factory.newBalanceMonitor(BM_CONFIG)).toBeInstanceOf(LitecoinBalanceMonitor)
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
