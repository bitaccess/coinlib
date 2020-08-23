import { CoinPayments, SUPPORTED_ASSET_SYMBOLS } from '../src'
import { HdTronPayments, TronPaymentsFactory } from '@faast/tron-payments'
import { omit } from 'lodash'
import { NetworkType } from '@faast/payments-common'
import { AddressType } from '@faast/bitcoin-payments'
import { AddressTypeT } from '../../bitcoin-payments/src/types';

const TRX_XPUB = 'xpub6BfusYhSxkNBEVoXKgecUo69gdz3ghgpa1oHBxpB18Q8rGGQSEfPpfEGYFGg5x6sS8oRu1mMmb3PhDLekpCoLY5bSwJqDAnrq4pzFVSzH3m'
const XLM_HOT = 'GB6NPF4YDMGKDOOOIJXTDGYZGTXBF5DBENSR44QTHYT7IVEF7BYYYOCS'
const XLM_DEPOSIT = 'GCKZUPOR6PEMW553RGEG23KNSZY6QZUU6I4LAOFGIWGI2RJWVCR5FYC7'

const CONFIG = {
  TRX: {
    hdKey: TRX_XPUB,
  },
  XLM: {
    hotAccount: XLM_HOT,
    depositAccount: XLM_DEPOSIT,
  },
  XRP: undefined,
}

const ACCOUNT_IDS = [TRX_XPUB, XLM_HOT, XLM_DEPOSIT]

const CONFIGURED_ASSET = 'TRX'
const EXPECTED_FACTORY_TYPE = TronPaymentsFactory
const EXPECTED_PAYMENTS_TYPE = HdTronPayments
const UNCONFIGURED_ASSET = 'XRP' as any
const UNSUPPORTED_ASSET = 'ABCDEF' as any

describe('CoinPayments', () => {
  describe('static', () => {
    describe('constructor', () => {
      it('instantiated with valid config', () => {
        expect(new CoinPayments(CONFIG)).toBeInstanceOf(CoinPayments)
      })
      it('throws on bad config', () => {
        expect(() => new CoinPayments(1 as any)).toThrow()
      })
    })
    describe('getFactory', () => {
      it('returns for supported', () => {
        expect(CoinPayments.getFactory(CONFIGURED_ASSET)).toBeInstanceOf(EXPECTED_FACTORY_TYPE)
      })
      it('throws for unupported', () => {
        expect(() => CoinPayments.getFactory(UNSUPPORTED_ASSET)).toThrow()
      })
    })
    describe('getPayments', () => {
      it('returns for supported', () => {
        expect(CoinPayments.getPayments(CONFIGURED_ASSET, CONFIG[CONFIGURED_ASSET])).toBeInstanceOf(EXPECTED_PAYMENTS_TYPE)
      })
      it('throws for unupported', () => {
        expect(() => CoinPayments.getFactory(UNSUPPORTED_ASSET)).toThrow()
      })
    })
  })

  describe('instance manual', () => {
    const cp = new CoinPayments(CONFIG)

    describe('forAsset', () => {
      it('returns for configured', () => {
        expect(cp.forAsset(CONFIGURED_ASSET)).toBeInstanceOf(EXPECTED_PAYMENTS_TYPE)
      })
      it('throws for unconfigured', () => {
        expect(() => cp.forAsset(UNCONFIGURED_ASSET)).toThrow()
      })
      it('throws for unsupported', () => {
        expect(() => cp.forAsset(UNSUPPORTED_ASSET)).toThrow()
      })
    })

    describe('isAssetConfigured', () => {
      it('returns true for configured', () => {
        expect(cp.isAssetConfigured(CONFIGURED_ASSET)).toBe(true)
      })
      it('returns false for unconfigured', () => {
        expect(cp.isAssetConfigured(UNCONFIGURED_ASSET)).toBe(false)
      })
      it('returns false for unsupported', () => {
        expect(cp.isAssetConfigured(UNSUPPORTED_ASSET)).toBe(false)
      })
    })

    describe('isAssetSupported', () => {
      it('returns true for configured', () => {
        expect(cp.isAssetSupported(CONFIGURED_ASSET)).toBe(true)
      })
      it('returns true for unconfigured', () => {
        expect(cp.isAssetSupported(UNCONFIGURED_ASSET)).toBe(true)
      })
      it('returns false for unsupported', () => {
        expect(cp.isAssetSupported(UNSUPPORTED_ASSET)).toBe(false)
      })
    })

    describe('getAccountIds', () => {
      it('returns correct IDs', () => {
        expect(cp.getAccountIds().sort()).toEqual(ACCOUNT_IDS.sort())
      })
    })

    describe('getPublicConfig', () => {
      it('returns correctly', () => {
        expect(cp.getPublicConfig()).toEqual(omit(CONFIG, [UNCONFIGURED_ASSET]))
      })
    })
  })

  describe('instance seed', () => {
    const cp = new CoinPayments({
      network: NetworkType.Mainnet,
      logger: console,
      seed: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      BTC: { addressType: AddressType.SegwitP2SH },
    })
    describe('getPublicConfig', () => {
      it('returns all assets', () => {
        const publicConfig = cp.getPublicConfig()
        expect(Object.keys(publicConfig).sort()).toEqual(SUPPORTED_ASSET_SYMBOLS.sort())
        expect(publicConfig.logger).toBeUndefined()
        expect(publicConfig.network).toBeUndefined()
        expect(publicConfig.seed).toBeUndefined()
        for (let assetSymbol of SUPPORTED_ASSET_SYMBOLS) {
          const assetConfig: any = publicConfig[assetSymbol]
          expect(assetConfig.seed).toBeUndefined()
          if (assetConfig.hdKey) {
            expect(assetConfig.hdKey).toMatch(/^xpub/)
          }
        }
      })
    })
    describe('isAssetConfigured', () => {
      it('returns true for all supported assets', () => {
        SUPPORTED_ASSET_SYMBOLS.forEach((s) => {
          expect(cp.isAssetConfigured(s)).toBe(true)
        })
      })
    })
  })

  describe('instance mnemonic', () => {
    let cp: CoinPayments
    it('can be instantiated', () => {
      cp = new CoinPayments({
        network: NetworkType.Mainnet,
        logger: console,
        seed: 'elite symbol tent speed figure sleep scatter pizza grab marriage retire cargo panda baby pelican'
      })
    })
    describe('getPublicConfig', () => {
      it('returns epected config', () => {
        const publicConfig = cp.getPublicConfig()
        expect(publicConfig).toEqual({
          'BTC': {
            'addressType': 'p2wpkh',
            'derivationPath': "m/84'/0'/0'",
            'hdKey': 'xpub6C5wPZ5JwqM6zk1nrdycxB5a5PokXWCH1iXWWJgq1bLdNTKjKbSZS2XA4WFSLqyicg7moaGv5wTJCpy6Tkxi9EZj9HFno9FHDTsRMgVGYm2',
            'network': 'mainnet',
          },
          'LTC': {
            'addressType': 'p2wpkh',
            'derivationPath': "m/84'/2'/0'",
            'hdKey': 'xpub6CzZCEwy1PvYjtY1JfowGo6QY6jiS2HRTYtUkbHr72N93jkoW536CPYtWQT69fiyiuap9i4REsQ6K4AX3M7G8RcX676EjZywkUPPUSExLiW',
            'network': 'mainnet',
          },
          'BCH': {
            'addressType': 'p2pkh',
            'derivationPath': "m/44'/145'/0'",
            'hdKey': 'xpub6CrWaNQ65RQXoUARmM9YQ2L4cjjkbzuCSri8atiTU5WXo7FiXCZEU9AehJjuxB69EMZbvAAjSGqTDRTCRmsMfWY4y2yXqE1udMmhoKSNmgW',
            'network': 'mainnet',
          },
          'DASH': {
            'addressType': 'p2pkh',
            'derivationPath': "m/44'/5'/0'",
            'hdKey': 'xpub6CMvjaTefTyqo7SnwSte4VjVzYBVE7PGGSrGv5j8WjAYVusTMmCDeEa9cE3VgW9okzgaxehpnCczxWqTXXuvbwFacmjWAGr7tm5h9aMZt7f',
            'network': 'mainnet',
          },
          'ETH': {
            'depositKeyIndex': 0,
            'hdKey': 'xpub6FUQp5E3GHcwJ8qsG198LiRcfyJFqy4txgxmzqLXiVSKFTXbn4gU9QcxDSy9NyTrc3EDXfsJVgnfrBgvQUoY3xFbazdgb3WCp2DTSfLUEJE',
            'network': 'mainnet',
          },
          'TRX': {
            'hdKey': 'xpub6DBzZS2xZBECBC9JR9xGk1t43j1HDEWM7e4YB4BLXek5kLejkwkmHYmqmoLHNsq5XdzgzJJQ853gxnrEgyB2HiTcPLz4tXAjrBpm41TgcJj',
            'network': 'mainnet',
          },
          'XLM': {
            'depositAccount': 'GC3FMVBXBKMM7GSO44AZSJVNKMEEQIAYXBOVSPHNPUL7LFT354GODSGK',
            'hotAccount': 'GCV4BPGIUMRLXBXC2OWO53COWHE376WWCWODJXEKLD22KV2CFDIV2K2X',
            'network': 'mainnet',
          },
          'XRP': {
            'hdKey': 'xpub6CTiddibsS5NpjAwaqapBXWayhkyRazX3KL6EbyvX9fhjd8zrseV2L1QEgR9A89cnfVgRUJWKtDHmawjgXZdb7QcPiJw7fPpt3bdDDnE8Am',
            'network': 'mainnet',
          },
        })
      })
    })
    describe('isAssetConfigured', () => {
      it('returns true for all supported assets', () => {
        SUPPORTED_ASSET_SYMBOLS.forEach((s) => {
          expect(cp.isAssetConfigured(s)).toBe(true)
        })
      })
    })
  })

  describe('instance mnemonic testnet', () => {
    let cp: CoinPayments
    it('can be instantiated', () => {
      cp = new CoinPayments({
        network: NetworkType.Testnet,
        logger: console,
        seed: 'elite symbol tent speed figure sleep scatter pizza grab marriage retire cargo panda baby pelican'
      })
    })
    describe('getPublicConfig', () => {
      it('returns epected config', () => {
        const publicConfig = cp.getPublicConfig()
        expect(publicConfig).toEqual({
          'BTC': {
            'addressType': 'p2wpkh',
            'derivationPath': "m/84'/0'/0'",
            'hdKey': 'xpub6C5wPZ5JwqM6zk1nrdycxB5a5PokXWCH1iXWWJgq1bLdNTKjKbSZS2XA4WFSLqyicg7moaGv5wTJCpy6Tkxi9EZj9HFno9FHDTsRMgVGYm2',
            'network': 'testnet',
          },
          'LTC': {
            'addressType': 'p2wpkh',
            'derivationPath': "m/84'/2'/0'",
            'hdKey': 'tpubDDNBiUmeift11girkro2UiRmsDqNRQnV1BUn79LzSw82o2RWaHtBLqDikSXsgAgDWp7imHaHmyE91Ef8SCxW1s4p9hqYR6eBLRyoENaLW2Y',
            'network': 'testnet',
          },
          'BCH': {
            'addressType': 'p2pkh',
            'derivationPath': "m/44'/1'/0'",
            'hdKey': 'tpubDD44v815t4axrr6ad3hf8Q7mo53GJ6Wsk3jJXdxiCZiteDp2fo8LQ8eGvDKnaA9Ui6P8QmUbzt1nf1JxEwPidRrtZ7cfujPSrjESpMfLofr',
            'network': 'testnet',
          },
          'ETH': {
            'depositKeyIndex': 0,
            'hdKey': 'xpub6FUQp5E3GHcwJ8qsG198LiRcfyJFqy4txgxmzqLXiVSKFTXbn4gU9QcxDSy9NyTrc3EDXfsJVgnfrBgvQUoY3xFbazdgb3WCp2DTSfLUEJE',
            'network': 'testnet',
          },
          'TRX': {
            'hdKey': 'xpub6DBzZS2xZBECBC9JR9xGk1t43j1HDEWM7e4YB4BLXek5kLejkwkmHYmqmoLHNsq5XdzgzJJQ853gxnrEgyB2HiTcPLz4tXAjrBpm41TgcJj',
            'network': 'testnet',
          },
          'XLM': {
            'depositAccount': 'GC3FMVBXBKMM7GSO44AZSJVNKMEEQIAYXBOVSPHNPUL7LFT354GODSGK',
            'hotAccount': 'GCV4BPGIUMRLXBXC2OWO53COWHE376WWCWODJXEKLD22KV2CFDIV2K2X',
            'network': 'testnet',
          },
          'XRP': {
            'hdKey': 'xpub6CTiddibsS5NpjAwaqapBXWayhkyRazX3KL6EbyvX9fhjd8zrseV2L1QEgR9A89cnfVgRUJWKtDHmawjgXZdb7QcPiJw7fPpt3bdDDnE8Am',
            'network': 'testnet',
          },
        })
      })
    })
    describe('isAssetConfigured', () => {
      it('returns true for all supported assets', () => {
        SUPPORTED_ASSET_SYMBOLS.forEach((s) => {
          expect(cp.isAssetConfigured(s)).toBe(true)
        })
      })
    })
  })


  describe('invalid config', () => {
    it('throws validation error', () => {
      expect(() => new CoinPayments({
        BTC: { addressType: AddressType.SegwitP2SH }
      })).toThrow('Invalid BTC config')
    })
  })
})
