import { BaseEthereumPaymentsConfig } from '@bitaccess/coinlib-ethereum'
import { UHdErc20PaymentsConfig } from './../../src/types'
import { BaseTransactionInfo, NetworkType, numericToHex } from '@bitaccess/coinlib-common'
import {
    hdAccount,
    CUSTOM_PATH_FIXTURE,
    DEFAULT_PATH_FIXTURE,
    CUSTOM_DERIVATION_PATH,
    SEED_ACCOUNT_FIXTURE
  } from '../fixtures/accounts'
  import {
    UHdErc20Payments,
    HdEthereumPayments,
    HdErc20Payments,
    HdErc20PaymentsConfig,
    EthereumPaymentsFactory,
  } from '../../src'
  
const LOCAL_NODE = 'http://localhost'
const LOCAL_PORT = 8547
const EXPECTED_TOKEN_ADDRESS = '0xb3F8822A038E8Cd733FBb05FdCbd658B9271AA13'
const EXPECTED_MASTER_ADDRESS = '0x5B31D375304BcF4116d45CDE3093ebc7aAf696fe'
const EXPECTED_FIRST_PROXY_ADDRESS = '0xda65e9e8461a6e8b9f2906133a5fa8c21f24da99'

const BASE_CONFIG: BaseEthereumPaymentsConfig = {
  network: NetworkType.Testnet,
  fullNode: `${LOCAL_NODE}:${LOCAL_PORT}`,
  gasStation: 'none',
  networkConstants: {
    networkName: 'ganache',
    chainId: 1337,
  },
}

const TOKEN_UTILS_CONFIG = {
  ...BASE_CONFIG,
  tokenAddress: EXPECTED_TOKEN_ADDRESS,
  name: 'BA_TEST_TOKEN',
  symbol: 'BTT',
  decimals: 7,
}


const ISSUER_SIGNATORY = {
    ...CUSTOM_PATH_FIXTURE.children[0],
    xkeys: CUSTOM_PATH_FIXTURE.xkeys,
    derivationPath: CUSTOM_DERIVATION_PATH,
  }

  
const UNIPUBKEY_ISSUER_TOKEN_CONFIG = {
  ...TOKEN_UTILS_CONFIG,
  uniPubKey: ISSUER_SIGNATORY.xkeys.xpub,
  hdKey: ISSUER_SIGNATORY.xkeys.xprv,
  derivationPath: ISSUER_SIGNATORY.derivationPath,
}

const SEED_ISSUER_TOKEN_CONFIG = {
  ...TOKEN_UTILS_CONFIG,
  uniPubKey: ISSUER_SIGNATORY.xkeys.xpub,
  seed: SEED_ACCOUNT_FIXTURE.seed,
  derivationPath: ISSUER_SIGNATORY.derivationPath,
}
const ISSUER_TOKEN_XPRV = 'xprv9yEU6rYL34B4v1VvHdBGK4euTiBFkdceCLB6EeaUwXhH3AjRMFrwjgXpFzpv5qUpGZNXoS6zYLGJDFU6DukSKKWYFS1GpcsurcnuNCLu25e'

describe('UHdEthereumPayments with seed account', () => {
  let hdE20P: UHdErc20Payments
  beforeEach(() => {
    hdE20P = new UHdErc20Payments(SEED_ISSUER_TOKEN_CONFIG)
  })

  describe('async init', () => {
    test('does nothing', async () => {
      const res = await hdE20P.init()
      expect(res).toBeUndefined()
    })
  })

  describe('async destroy', () => {
    test('does nothing', async () => {
      const res = await hdE20P.destroy()
      expect(res).toBeUndefined()
    })
  })

  describe('async getAvailableUtxos', () => {
    test('returns empty array', async () => {
      const res = await hdE20P.getAvailableUtxos()
      expect(res).toStrictEqual([])
    })
  })

  describe('async usesSequenceNumber', () => {
    test('returns true', async () => {
      const res = hdE20P.usesSequenceNumber()
      expect(res)
    })
  })

  describe('async usesUtxos', () => {
    test('returns false', async () => {
      const res = hdE20P.usesUtxos()
      expect(res).toBe(false)
    })
  })

  describe('getFullConfig', () => {
    test('returns full config', () => {
      expect(hdE20P.getFullConfig()).toStrictEqual({
        decimals: SEED_ISSUER_TOKEN_CONFIG.decimals,
        derivationPath: SEED_ISSUER_TOKEN_CONFIG.derivationPath,
        network: SEED_ISSUER_TOKEN_CONFIG.network,
        gasStation: SEED_ISSUER_TOKEN_CONFIG.gasStation,
        fullNode: SEED_ISSUER_TOKEN_CONFIG.fullNode,
        hdKey: ISSUER_TOKEN_XPRV,
        name: SEED_ISSUER_TOKEN_CONFIG.name,
        networkConstants: SEED_ISSUER_TOKEN_CONFIG.networkConstants,
        symbol: SEED_ISSUER_TOKEN_CONFIG.symbol,
        tokenAddress: SEED_ISSUER_TOKEN_CONFIG.tokenAddress
      })
    })
  })

})

describe('UHdEthereumPayments with uniPubKey account', () => {
  let hdE20P: UHdErc20Payments
  beforeEach(() => {
    hdE20P = new UHdErc20Payments(UNIPUBKEY_ISSUER_TOKEN_CONFIG)
  })

  describe('async init', () => {
    test('does nothing', async () => {
      const res = await hdE20P.init()
      expect(res).toBeUndefined()
    })
  })

  describe('async destroy', () => {
    test('does nothing', async () => {
      const res = await hdE20P.destroy()
      expect(res).toBeUndefined()
    })
  })

  describe('async getAvailableUtxos', () => {
    test('returns empty array', async () => {
      const res = await hdE20P.getAvailableUtxos()
      expect(res).toStrictEqual([])
    })
  })

  describe('async usesSequenceNumber', () => {
    test('returns true', async () => {
      const res = hdE20P.usesSequenceNumber()
      expect(res)
    })
  })

  describe('async usesUtxos', () => {
    test('returns false', async () => {
      const res = hdE20P.usesUtxos()
      expect(res).toBe(false)
    })
  })

  describe('getFullConfig', () => {
    test('returns full config', () => {
      expect(hdE20P.getFullConfig()).toStrictEqual({
        decimals: SEED_ISSUER_TOKEN_CONFIG.decimals,
        derivationPath: SEED_ISSUER_TOKEN_CONFIG.derivationPath,
        network: SEED_ISSUER_TOKEN_CONFIG.network,
        gasStation: SEED_ISSUER_TOKEN_CONFIG.gasStation,
        fullNode: SEED_ISSUER_TOKEN_CONFIG.fullNode,
        hdKey: SEED_ISSUER_TOKEN_CONFIG.uniPubKey,
        name: SEED_ISSUER_TOKEN_CONFIG.name,
        networkConstants: SEED_ISSUER_TOKEN_CONFIG.networkConstants,
        symbol: SEED_ISSUER_TOKEN_CONFIG.symbol,
        tokenAddress: SEED_ISSUER_TOKEN_CONFIG.tokenAddress
      })
    })
  })
  
})
