import { CoinPayments, SUPPORTED_NETWORK_SYMBOLS } from '../src'
import { HdTronPayments, TronPaymentsFactory, TronPaymentsConfig } from '@bitaccess/coinlib-tron'
import { omit } from 'lodash'
import { NetworkType } from '@bitaccess/coinlib-common'
import { AddressType } from '@bitaccess/coinlib-bitcoin'
import { StellarPaymentsConfig } from '@bitaccess/coinlib-stellar'

const TRX_XPUB = 'xpub6BfusYhSxkNBEVoXKgecUo69gdz3ghgpa1oHBxpB18Q8rGGQSEfPpfEGYFGg5x6sS8oRu1mMmb3PhDLekpCoLY5bSwJqDAnrq4pzFVSzH3m'
const XLM_HOT = 'GB6NPF4YDMGKDOOOIJXTDGYZGTXBF5DBENSR44QTHYT7IVEF7BYYYOCS'
const XLM_DEPOSIT = 'GCKZUPOR6PEMW553RGEG23KNSZY6QZUU6I4LAOFGIWGI2RJWVCR5FYC7'

const CONFIG = {
  TRX: {
    hdKey: TRX_XPUB,
  } as TronPaymentsConfig,
  XLM: {
    hotAccount: XLM_HOT,
    depositAccount: XLM_DEPOSIT,
  } as StellarPaymentsConfig,
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
        expect(CoinPayments.getFactory(CONFIGURED_ASSET).newPayments(CONFIG[CONFIGURED_ASSET])).toBeInstanceOf(EXPECTED_PAYMENTS_TYPE)
      })
      it('throws for unupported', () => {
        expect(() => CoinPayments.getFactory(UNSUPPORTED_ASSET)).toThrow()
      })
    })
  })

  describe('instance manual', () => {
    const cp = new CoinPayments(CONFIG)

    describe('forNetwork', () => {
      it('returns for configured', () => {
        expect(cp.forNetwork(CONFIGURED_ASSET)).toBeInstanceOf(EXPECTED_PAYMENTS_TYPE)
      })
      it('throws for unconfigured', () => {
        expect(() => cp.forNetwork(UNCONFIGURED_ASSET)).toThrow()
      })
      it('throws for unsupported', () => {
        expect(() => cp.forNetwork(UNSUPPORTED_ASSET)).toThrow()
      })
    })

    describe('getSpecificPayments', () => {
      it('returns for configured', () => {
        expect(cp.getSpecificPayments(CONFIGURED_ASSET, CONFIG[CONFIGURED_ASSET])).toBeInstanceOf(EXPECTED_PAYMENTS_TYPE)
      })
      it('throws for unsupported', () => {
        expect(() => cp.forNetwork(UNSUPPORTED_ASSET, CONFIG[CONFIGURED_ASSET])).toThrow()
      })
    })

    describe('isNetworkConfigured', () => {
      it('returns true for configured', () => {
        expect(cp.isNetworkConfigured(CONFIGURED_ASSET)).toBe(true)
      })
      it('returns false for unconfigured', () => {
        expect(cp.isNetworkConfigured(UNCONFIGURED_ASSET)).toBe(false)
      })
      it('returns false for unsupported', () => {
        expect(cp.isNetworkConfigured(UNSUPPORTED_ASSET)).toBe(false)
      })
    })

    describe('isNetworkSupported', () => {
      it('returns true for configured', () => {
        expect(cp.isNetworkSupported(CONFIGURED_ASSET)).toBe(true)
      })
      it('returns true for unconfigured', () => {
        expect(cp.isNetworkSupported(UNCONFIGURED_ASSET)).toBe(true)
      })
      it('returns false for unsupported', () => {
        expect(cp.isNetworkSupported(UNSUPPORTED_ASSET)).toBe(false)
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
      seed: '14109019bf61f2b9290934469986b23dc8ea94a90b74dbcaa68ec5a03103c549fe5737ac803cf4a4e22564e387b03ee35b67d84f99c46f739504abb502782302',
      BTC: { addressType: AddressType.SegwitP2SH },
    })
    describe('getPublicConfig', () => {
      it('returns all assets', () => {
        const publicConfig = cp.getPublicConfig()
        expect(Object.keys(publicConfig).sort()).toEqual(SUPPORTED_NETWORK_SYMBOLS.sort())
        expect(publicConfig.logger).toBeUndefined()
        expect(publicConfig.network).toBeUndefined()
        expect(publicConfig.seed).toBeUndefined()
        for (const assetSymbol of SUPPORTED_NETWORK_SYMBOLS) {
          const assetConfig: any = publicConfig[assetSymbol]
          expect(assetConfig.seed).toBeUndefined()
          if (assetConfig.hdKey) {
            expect(assetConfig.hdKey).toMatch(/^xpub/)
          }
        }
      })
    })
    describe('isNetworkConfigured', () => {
      it('returns true for all supported assets', () => {
        SUPPORTED_NETWORK_SYMBOLS.forEach((s) => {
          expect(cp.isNetworkConfigured(s)).toBe(true)
        })
      })
    })
    describe('getFingerprint', () => {
      it('returns fingerprint', () => {
        const fingerprint: string = cp.getFingerprint()
        const expectedFingerprint: string = "335fbec6"
        expect(fingerprint).toBe(expectedFingerprint)
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
            'derivationPath': "m/44'/145'/0'",
            'hdKey': 'xpub6CrWaNQ65RQXoUARmM9YQ2L4cjjkbzuCSri8atiTU5WXo7FiXCZEU9AehJjuxB69EMZbvAAjSGqTDRTCRmsMfWY4y2yXqE1udMmhoKSNmgW',
            'network': 'mainnet',
          },
          'DOGE': {
            'derivationPath': "m/44'/3'/0'",
            'hdKey': 'xpub6BkpqKsQa8pnP9fz2E6KtQF7GBFLknp1Q4Rao9muRT8sUxjnuD8szR9zrEmi9DcRGcSSgaDacMoNz4j5zr8VJNaSfrCsEtUgjYJKzMcUzPP',
            'network': 'mainnet',
          },
          'ETH': {
            'depositKeyIndex': 0,
            "derivationPath": "m/44'/60'/0'/0",
            'hdKey': 'xpub6FBYZaMDSrTFkJye8iA3Aph8ufeZC8edP1YeiEA2TZ5T5181GpRLwtdD7QsCHQUJhUi6wBQDbWqgo76rdSTLh3p6yJhRGGzHA8qzCPVz3bi',
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
    describe('isNetworkConfigured', () => {
      it('returns true for all supported assets', () => {
        SUPPORTED_NETWORK_SYMBOLS.forEach((s) => {
          expect(cp.isNetworkConfigured(s)).toBe(true)
        })
      })
    })
    describe('getFingerprint', () => {
      it('returns fingerprint', () => {
        const fingerprint: string = cp.getFingerprint()
        const expectedFingerprint: string = "d9906b5e"
        expect(fingerprint).toBe(expectedFingerprint)
      })
    })
    describe('getRawSignerId', () => {
      it('returns singerId', () => {
        const signerId: string = cp.getRawSignerId()
        const expectedSignerId: string = "3607a03e28f3990be61ed3f496e4c3f6ba5c373449c1764f0839bb54dde2c433"
        expect(signerId).toBe(expectedSignerId)
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
            'hdKey': 'tpubDCTZuntzf7JZGYCeJpxiA6QwQWuQWthLZM7orrjyMW6X7jzSPpHeaUBzJYLDsLvxQaegR9nnd3HLu1Thrcox2g22Ct16UfuWoRTq7hFtFjt',
            'network': 'testnet',
          },
          'DOGE': {
            'derivationPath': "m/44'/3'/0'",
            // 'hdKey': 'xpub6BkpqKsQa8pnP9fz2E6KtQF7GBFLknp1Q4Rao9muRT8sUxjnuD8szR9zrEmi9DcRGcSSgaDacMoNz4j5zr8VJNaSfrCsEtUgjYJKzMcUzPP',
            'hdKey': 'tpubDC8TMZh6HQnEewrqUR5R6KaUbJLzkBK4wh1t9hq3mMtmEFQVyRyy8rpq6GrVfiZf4WyMJ9jT9TdRgFDhPhyjBp2jjSxAvR8vKVtjkNDLUWg',
            'network': 'testnet',
          },
          'LTC': {
            'addressType': 'p2wpkh',
            'derivationPath': "m/84'/2'/0'",
            'hdKey': 'tpubDDNBiUmeift11girkro2UiRmsDqNRQnV1BUn79LzSw82o2RWaHtBLqDikSXsgAgDWp7imHaHmyE91Ef8SCxW1s4p9hqYR6eBLRyoENaLW2Y',
            'network': 'testnet',
          },
          'BCH': {
            'derivationPath': "m/44'/145'/0'",
            'hdKey': 'tpubDDE96cDmnhMz5GMHDY8dbwfRwrqQbPQFzVJRwSmbozGRYPvRbRQKcaqUwLphUg3P2G6WXjgbyNfVubwopdibYwzN2diqWkg9DKN7ZJoYwXg',
            'network': 'testnet',
          },
          'ETH': {
            'depositKeyIndex': 0,
            "derivationPath": "m/44'/60'/0'/0",
            'hdKey': 'xpub6FBYZaMDSrTFkJye8iA3Aph8ufeZC8edP1YeiEA2TZ5T5181GpRLwtdD7QsCHQUJhUi6wBQDbWqgo76rdSTLh3p6yJhRGGzHA8qzCPVz3bi',
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
    describe('isNetworkConfigured', () => {
      it('returns true for all supported assets', () => {
        SUPPORTED_NETWORK_SYMBOLS.forEach((s) => {
          expect(cp.isNetworkConfigured(s)).toBe(true)
        })
      })
    })
    describe('getFingerprint', () => {
      it('returns fingerprint', () => {
        const fingerprint: string = cp.getFingerprint()
        const expectedFingerprint: string = "d9906b5e"
        expect(fingerprint).toBe(expectedFingerprint)
      })
    })
    describe('getRawSignerId', () => {
      it('returns singerId', () => {
        const signerId: string = cp.getRawSignerId()
        const expectedSignerId: string = "3607a03e28f3990be61ed3f496e4c3f6ba5c373449c1764f0839bb54dde2c433"
        expect(signerId).toBe(expectedSignerId)
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
