import { CoinPayments, SUPPORTED_ASSET_SYMBOLS } from '../src'
import { HdTronPayments, TronPaymentsFactory } from '@faast/tron-payments'
import { omit } from 'lodash'
import { NetworkType } from '../../payments-common/src/types';

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
      seed: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
    })
    describe('getPublicConfig', () => {
      it('returns all assets', () => {
        const publicConfig = cp.getPublicConfig()
        expect(Object.keys(publicConfig).sort()).toEqual(SUPPORTED_ASSET_SYMBOLS.sort())
        expect(publicConfig.logger).toBe(undefined)
        expect(publicConfig.network).toBe(undefined)
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
})
