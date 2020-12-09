import { execPath } from 'process'
import Web3 from 'web3'
import { TestLogger } from '../../../common/testUtils'
import {
  EthereumPaymentsFactory,
  EthereumPaymentsUtils,
  HdEthereumPayments,
  KeyPairEthereumPayments,
  HdEthereumPaymentsConfig,
  KeyPairEthereumPaymentsConfig,
  deriveSignatory,
} from '../src'

import { hdAccount } from './fixtures/accounts'
import { EthereumPaymentsUtilsConfig } from '../src/types';

const logger = new TestLogger('EthereumPaymentsFactory')

const account0 = hdAccount.rootChild[0]
const FULL_NODE = 'http://localhost'

const HD_CONFIG: HdEthereumPaymentsConfig = {
  fullNode: FULL_NODE,
  hdKey: account0.xkeys.xprv,
  logger,
}
const KP_CONFIG: KeyPairEthereumPaymentsConfig = {
  fullNode: FULL_NODE,
  keyPairs: [ account0.xkeys.xprv, account0.keys.prv, account0.address.toLowerCase() ],
  logger,
}
const UTILS_CONFIG: EthereumPaymentsUtilsConfig = {
  fullNode: FULL_NODE,
  logger,
}

describe('EthereumPaymentsFactory', () => {
  const factory = new EthereumPaymentsFactory()

  describe('newPayments', () => {
    it('should instantiate HdEthereumPayments', () => {
      const hdP = factory.newPayments(HD_CONFIG)

      expect(hdP).toBeInstanceOf(HdEthereumPayments)
      expect(hdP.getPublicConfig()).toStrictEqual({
        depositKeyIndex: 0,
        hdKey: deriveSignatory(account0.xkeys.xpub, 0).xkeys.xpub
      })
    })

    it('should instantiate KeyPairEthereumPayments', () => {
      const kP = factory.newPayments(KP_CONFIG)

      expect(kP).toBeInstanceOf(KeyPairEthereumPayments)
      expect(kP.getPublicConfig()).toStrictEqual({
        keyPairs: { 0: account0.address.toLowerCase() }
      })
    })

    it('should fail to instantiate unrecognized config', () => {
      expect(() => factory.newPayments({} as any)).toThrow('Cannot instantiate ethereum-payments for unsupported config')
    })
  })

  describe('newUtils', () => {
    it('should instantiate EthereumPaymentsUtils', () => {
      expect(factory.newUtils(UTILS_CONFIG)).toBeInstanceOf(EthereumPaymentsUtils)
    })

    it('should fail to instantiate null config', () => {
      expect(() => factory.newUtils(null as any)).toThrow('Invalid config')
    })
  })

  describe('initConnected', () => {
    it('should instantiate both payments with same web3 instance', async () => {
      const payments1 = await factory.initPayments(HD_CONFIG)
      const payments2 = await factory.initPayments(KP_CONFIG)
      const utils = await factory.initUtils(UTILS_CONFIG)
      expect(payments1.web3).toBeInstanceOf(Web3)
      expect(payments1.web3).toBe(payments2.web3)
      expect(payments2.web3).toBe(utils.web3)
    })
  })
})
