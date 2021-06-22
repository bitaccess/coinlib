import { FeeLevel } from '@bitaccess/coinlib-common'
import { BitcoinCashAddressFormat, BitcoinCashPaymentsUtils } from '../src'
import { PRIVATE_KEY, ADDRESS_CASH, ADDRESS_BITPAY, ADDRESS_LEGACY } from './fixtures'
import { logger } from './utils'

describe('BitcoinCashPaymentUtils', () => {
  const pu = new BitcoinCashPaymentsUtils({ logger })

  describe('getFeeRateRecommendation', () => {
    it('should return a value', async () => {
      expect(await pu.getFeeRateRecommendation(FeeLevel.Medium)).toBeDefined()
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
      expect(await pu.getPayportValidationMessage({} as any)).toMatch('Invalid payport')
    })
    it('return string for valid address with invalid extraId', async () => {
      expect(await pu.getPayportValidationMessage({ address: ADDRESS_CASH, extraId: '' })).toMatch('Invalid payport')
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
})
