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
  DEFAULT_MAINNET_CONSTANTS,
  NetworkConstants,
  EthereumPaymentsUtilsConfig,
  HdErc20Payments,
} from '../src'

import { hdAccount } from './fixtures/accounts'

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

const TOKEN_CONFIG = {
  tokenAddress: '0x1234',
  name: 'BA_TEST_TOKEN',
  symbol: 'BTT',
  decimals: 7,
}

const CUSTOM_NETWORK: NetworkConstants = {
  networkName: 'Brilliant Baboon Blockchain',
  nativeCoinName: 'Brilliant Baboon Booty',
  nativeCoinSymbol: 'BBB',
  nativeCoinDecimals: 888,
  defaultDerivationPath: "m/44'/888'/0'/0",
  chainId: 888,
}

describe('EthereumPaymentsFactory', () => {
  const factory = new EthereumPaymentsFactory()

  describe('newPayments', () => {
    it('should instantiate HdEthereumPayments', () => {
      const hdP = factory.newPayments(HD_CONFIG)

      expect(hdP).toBeInstanceOf(HdEthereumPayments)
      expect(hdP.getPublicConfig()).toStrictEqual({
        depositKeyIndex: 0,
        hdKey: deriveSignatory(account0.xkeys.xpub, 0).xkeys.xpub,
        derivationPath: DEFAULT_MAINNET_CONSTANTS.defaultDerivationPath,
      })
      expect(hdP.coinDecimals).toBe(DEFAULT_MAINNET_CONSTANTS.nativeCoinDecimals)
      expect(hdP.coinName).toBe(DEFAULT_MAINNET_CONSTANTS.nativeCoinName)
      expect(hdP.coinSymbol).toBe(DEFAULT_MAINNET_CONSTANTS.nativeCoinSymbol)
      expect(hdP.nativeCoinDecimals).toBe(DEFAULT_MAINNET_CONSTANTS.nativeCoinDecimals)
      expect(hdP.nativeCoinName).toBe(DEFAULT_MAINNET_CONSTANTS.nativeCoinName)
      expect(hdP.nativeCoinSymbol).toBe(DEFAULT_MAINNET_CONSTANTS.nativeCoinSymbol)
      expect(hdP.networkConstants).toEqual(DEFAULT_MAINNET_CONSTANTS)
    })

    it('should instantiate HdEthereumPayments for custom network', () => {
      const hdP = factory.newPayments({
        ...HD_CONFIG,
        networkConstants: CUSTOM_NETWORK,
      })

      expect(hdP).toBeInstanceOf(HdEthereumPayments)
      expect(hdP.getPublicConfig()).toStrictEqual({
        depositKeyIndex: 0,
        hdKey: deriveSignatory(account0.xkeys.xpub, 0).xkeys.xpub,
        derivationPath: CUSTOM_NETWORK.defaultDerivationPath,
      })
      expect(hdP.coinDecimals).toBe(CUSTOM_NETWORK.nativeCoinDecimals)
      expect(hdP.coinName).toBe(CUSTOM_NETWORK.nativeCoinName)
      expect(hdP.coinSymbol).toBe(CUSTOM_NETWORK.nativeCoinSymbol)
      expect(hdP.nativeCoinDecimals).toBe(CUSTOM_NETWORK.nativeCoinDecimals)
      expect(hdP.nativeCoinName).toBe(CUSTOM_NETWORK.nativeCoinName)
      expect(hdP.nativeCoinSymbol).toBe(CUSTOM_NETWORK.nativeCoinSymbol)
      expect(hdP.networkConstants).toEqual(CUSTOM_NETWORK)
    })

    it('should instantiate HdErc20Payments', () => {
      const hdP = factory.newPayments({
        ...HD_CONFIG,
        ...TOKEN_CONFIG,
      })

      expect(hdP).toBeInstanceOf(HdErc20Payments)
      expect(hdP.getPublicConfig()).toStrictEqual({
        depositKeyIndex: 0,
        hdKey: deriveSignatory(account0.xkeys.xpub, 0).xkeys.xpub,
        derivationPath: DEFAULT_MAINNET_CONSTANTS.defaultDerivationPath,
        ...TOKEN_CONFIG,
      })
      expect(hdP.coinDecimals).toBe(TOKEN_CONFIG.decimals)
      expect(hdP.coinName).toBe(TOKEN_CONFIG.name)
      expect(hdP.coinSymbol).toBe(TOKEN_CONFIG.symbol)
      expect(hdP.nativeCoinDecimals).toBe(DEFAULT_MAINNET_CONSTANTS.nativeCoinDecimals)
      expect(hdP.nativeCoinName).toBe(DEFAULT_MAINNET_CONSTANTS.nativeCoinName)
      expect(hdP.nativeCoinSymbol).toBe(DEFAULT_MAINNET_CONSTANTS.nativeCoinSymbol)
      expect(hdP.networkConstants).toEqual(DEFAULT_MAINNET_CONSTANTS)
    })

    it('should instantiate HdErc20Payments for custom network', () => {
      const hdP = factory.newPayments({
        ...HD_CONFIG,
        ...TOKEN_CONFIG,
        networkConstants: CUSTOM_NETWORK,
      })

      expect(hdP).toBeInstanceOf(HdErc20Payments)
      expect(hdP.getPublicConfig()).toStrictEqual({
        depositKeyIndex: 0,
        hdKey: deriveSignatory(account0.xkeys.xpub, 0).xkeys.xpub,
        derivationPath: CUSTOM_NETWORK.defaultDerivationPath,
        ...TOKEN_CONFIG,
      })
      expect(hdP.coinDecimals).toBe(TOKEN_CONFIG.decimals)
      expect(hdP.coinName).toBe(TOKEN_CONFIG.name)
      expect(hdP.coinSymbol).toBe(TOKEN_CONFIG.symbol)
      expect(hdP.nativeCoinDecimals).toBe(CUSTOM_NETWORK.nativeCoinDecimals)
      expect(hdP.nativeCoinName).toBe(CUSTOM_NETWORK.nativeCoinName)
      expect(hdP.nativeCoinSymbol).toBe(CUSTOM_NETWORK.nativeCoinSymbol)
      expect(hdP.networkConstants).toEqual(CUSTOM_NETWORK)
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
