import { FeeLevel, NetworkType } from '@bitaccess/coinlib-common'
import { BitcoinCashAddressFormat, BitcoinCashPaymentsUtils, hexSeedToBuffer } from '../src'
import { PRIVATE_KEY, ADDRESS_CASH, ADDRESS_BITPAY, ADDRESS_LEGACY } from './fixtures'
import { logger } from './utils'
import { AddressType } from '@bitaccess/coinlib-bitcoin'


describe('BitcoinCashPaymentUtils', () => {
  const pu = new BitcoinCashPaymentsUtils({ logger })

  describe('getFeeRateRecommendation', () => {
    it('should return a value', async () => {
      expect(pu.getFeeRateRecommendation(FeeLevel.Medium)).toBeDefined()
    })
  })

  describe('isValidPrivateKey', () => {
    it('should return true for valid', async () => {
      expect(pu.isValidPrivateKey(PRIVATE_KEY)).toBe(true)
    })
    it('should return false for invalid', async () => {
      expect(pu.isValidPrivateKey('fake')).toBe(false)
    })
  })

  describe('getPayportValidationMessage', () => {
    it('returns string for empty object', async () => {
      expect(pu.getPayportValidationMessage({} as any)).toMatch('Invalid payport')
    })
    it('return string for valid address with invalid extraId', async () => {
      expect(pu.getPayportValidationMessage({ address: ADDRESS_CASH, extraId: '' })).toMatch('Invalid payport')
    })
  })

  describe('isValidExtraId', () => {
    it('should return false', async () => {
      expect(pu.isValidExtraId('fake')).toBe(false)
    })
  })

  describe('validAddressFormat = undefined', () => {
    describe('isValidAddress', () => {
      it('should return true for cash address', async () => {
        expect(pu.isValidAddress(ADDRESS_CASH)).toBe(true)
      })
      it('should return true for bitpay address', async () => {
        expect(pu.isValidAddress(ADDRESS_BITPAY)).toBe(true)
      })
      it('should return true for legacy address', async () => {
        expect(pu.isValidAddress(ADDRESS_LEGACY)).toBe(true)
      })
      it('should return false for invalid', async () => {
        expect(pu.isValidAddress('fake')).toBe(false)
      })
    })

    describe('standardizeAddress', () => {
      it('should return same address for cash address', async () => {
        expect(pu.standardizeAddress(ADDRESS_CASH)).toBe(ADDRESS_CASH)
      })
      it('should return cash address for bitpay address', async () => {
        expect(pu.standardizeAddress(ADDRESS_BITPAY)).toBe(ADDRESS_CASH)
      })
      it('should return cash address for legacy address', async () => {
        expect(pu.standardizeAddress(ADDRESS_LEGACY)).toBe(ADDRESS_CASH)
      })
      it('should return null for invalid address', async () => {
        expect(pu.standardizeAddress('fake')).toBe(null)
      })
    })
  })

  describe('validAddressFormat = legacy', () => {
    const puLegacy = new BitcoinCashPaymentsUtils({ logger, validAddressFormat: BitcoinCashAddressFormat.Legacy })

    describe('isValidAddress', () => {
      it('should return false for cash address', () => {
        expect(puLegacy.isValidAddress(ADDRESS_CASH)).toBe(false)
      })
      it('should return false for bitpay address', async () => {
        expect(puLegacy.isValidAddress(ADDRESS_BITPAY)).toBe(false)
      })
      it('should return true for legacy address', async () => {
        expect(puLegacy.isValidAddress(ADDRESS_LEGACY)).toBe(true)
      })
      it('should return false for invalid', async () => {
        expect(pu.isValidAddress('fake')).toBe(false)
      })
    })

    describe('standardizeAddress', () => {
      it('should return legacy address for cash address', async () => {
        expect(puLegacy.standardizeAddress(ADDRESS_CASH)).toBe(ADDRESS_LEGACY)
      })
      it('should return legacy address for bitpay address', async () => {
        expect(puLegacy.standardizeAddress(ADDRESS_BITPAY)).toBe(ADDRESS_LEGACY)
      })
      it('should return same address for legacy address', async () => {
        expect(puLegacy.standardizeAddress(ADDRESS_LEGACY)).toBe(ADDRESS_LEGACY)
      })
      it('should return null for invalid address', async () => {
        expect(puLegacy.standardizeAddress('fake')).toBe(null)
      })
    })
  })

  describe('determinePathForIndex', () => {
    const puMainnet = new BitcoinCashPaymentsUtils({ network: NetworkType.Mainnet })
    const puTestnet = new BitcoinCashPaymentsUtils({ network: NetworkType.Testnet })
    test('Mainnet SegwitNative', () => {
      const options = {addressType: AddressType.Legacy}
      const path = puMainnet.determinePathForIndex(3, options)
      expect(path).toBe(`m/44'/145'/3'`)
    })
    test('Mainnet MultisigSegwitNative', () => {
      const options = {addressType: AddressType.MultisigLegacy}
      const path = puMainnet.determinePathForIndex(3, options)
      expect(path).toBe(`m/87'/145'/3'`)
    })
    test('Testnet SegwitP2SH throw not support err', () => {
      const functionToTrow = () => {
        const options = {addressType: AddressType.SegwitP2SH}
        puTestnet.determinePathForIndex(4, options)
      }
      expect(functionToTrow).toThrow(`Bitcoin Cash does not support this type ${AddressType.SegwitP2SH}`)
    })
    test('Testnet MultisigLegacy', () => {
      const options = {addressType: AddressType.MultisigLegacy}
      const path = puTestnet.determinePathForIndex(4, options)
      expect(path).toBe(`m/87'/145'/4'`)
    })
  })

  describe('deriveUniPubKeyForPath', () => {
    const puMainnet = new BitcoinCashPaymentsUtils()
    const puTestnet = new BitcoinCashPaymentsUtils({ network: NetworkType.Testnet })
    const seedHex =
      '716bbb2c373406156d6fc471db0c62d957e27d97f1d07bfb0b2d22f04d07b75b32f2542e20f077251d7bc390cac8847ac6e64d94bccff1e1b2cd82802df35a78'
    const seedBuffer = hexSeedToBuffer(seedHex)

    test('Mainnet Legacy', () => {
      const xpub = puMainnet.deriveUniPubKeyForPath(seedBuffer, `m/44'/145'/3'`)
      const expectedXpub =
        'xpub6ChJW6rYRsLAkb1TWNYQxL1sbLE1m96LM3sbk3Te5ZixvMLJqUqgXwkynGkuAY5XqkgsJJX1RL45a3CPAtJLEuooUVyMnbhoNTaQiiCJRgw'
      expect(xpub).toBe(expectedXpub)
    })

    test('Mainnet SegwitNative support arbitrary path', () => {
      const xpub = puMainnet.deriveUniPubKeyForPath(seedBuffer, `m/84'/145'/3'/9'`)
      const expectedXpub =
        'xpub6FFebG3fH7BRK9Y1d4wMcXCPcrtgmbgUqBjS5eE9jmhUWrvJqsoR3dRtJx9bWmsfrm89hTbo9quKWzQ7RrjiTa8EgSQV1Mwb9BjTwK3fnEL'
      expect(xpub).toBe(expectedXpub)
    })

    test('Testnet MultisigLegacy', () => {
      const xpub = puTestnet.deriveUniPubKeyForPath(seedBuffer, `m/87'/1'/4'`)
      const expectedXpub =
        'tpubDCHyWQfXp2aefcHocJn7CvtRJ1mmqbm2x8D1v3HJ8QF9cDoBK25327B42W5HtyvEmfVZB3f3zVHWwQp4BcWKosQSuugqCDZH7KFvmtbtSwz'
      expect(xpub).toBe(expectedXpub)
    })
  })
})
