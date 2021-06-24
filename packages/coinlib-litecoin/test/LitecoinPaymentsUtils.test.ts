import { LitecoinPaymentsUtils, LitecoinAddressFormat } from '../src'
import {
  PRIVATE_KEY,
  ADDRESS_LEGACY,
  ADDRESS_SEGWIT_P2SH,
  ADDRESS_SEGWIT_P2SH_DEPRECATED,
  ADDRESS_SEGWIT_NATIVE,
} from './fixtures'
import { logger } from './utils'

const VALID_ADDRESS = ADDRESS_SEGWIT_P2SH

describe('LitecoinPaymentsUtils', () => {
  const pu = new LitecoinPaymentsUtils({ logger })

  describe('isValidExtraId', () => {
    test('should return false', async () => {
      expect(await pu.isValidExtraId('fake')).toBe(false)
    })
  })

  describe('isValidPrivateKey', () => {
    test('should return true for valid', async () => {
      expect(await pu.isValidPrivateKey(PRIVATE_KEY)).toBe(true)
    })
    test('should return false for invalid', async () => {
      expect(await pu.isValidPrivateKey('fake')).toBe(false)
    })
  })

  describe('getPayportValidationMessage', () => {
    it('returns string for empty object', async () => {
      expect(await pu.getPayportValidationMessage({} as any)).toMatch('Invalid payport')
    })
    it('return string for valid address with invalid extraId', async () => {
      expect(await pu.getPayportValidationMessage({ address: VALID_ADDRESS, extraId: '' })).toMatch('Invalid payport')
    })
  })

  describe('validAddressFormat = undefined', () => {

    describe('isValidAddress', () => {
      it('should return true for legacy address', async () => {
        expect(pu.isValidAddress(ADDRESS_LEGACY)).toBe(true)
      })
      it('should return true for modern p2sh segwit address', async () => {
        expect(pu.isValidAddress(ADDRESS_SEGWIT_P2SH)).toBe(true)
      })
      it('should return true for deprecated p2sh segwit address', async () => {
        expect(pu.isValidAddress(ADDRESS_SEGWIT_P2SH_DEPRECATED)).toBe(true)
      })
      it('should return true for native segwit address', async () => {
        expect(pu.isValidAddress(ADDRESS_SEGWIT_NATIVE)).toBe(true)
      })
      it('should return false for invalid', async () => {
        expect(pu.isValidAddress('fake')).toBe(false)
      })
    })

    describe('standardizeAddress', () => {
      it('should return same address for legacy address', async () => {
        expect(pu.standardizeAddress(ADDRESS_LEGACY)).toBe(ADDRESS_LEGACY)
      })
      it('should return same address for modern p2sh segwit address', async () => {
        expect(pu.standardizeAddress(ADDRESS_SEGWIT_P2SH)).toBe(ADDRESS_SEGWIT_P2SH)
      })
      it('should return modern p2sh address for deprecated p2sh segwit address', async () => {
        expect(pu.standardizeAddress(ADDRESS_SEGWIT_P2SH_DEPRECATED)).toBe(ADDRESS_SEGWIT_P2SH)
      })
      it('should return same address for native segwit address', async () => {
        expect(pu.standardizeAddress(ADDRESS_SEGWIT_NATIVE)).toBe(ADDRESS_SEGWIT_NATIVE)
      })
      it('should return null for invalid address', async () => {
        expect(pu.standardizeAddress('fake')).toBe(null)
      })
    })
  })

  describe('validAddressFormat = deprecated', () => {
    const puDeprecated = new LitecoinPaymentsUtils({ logger, validAddressFormat: LitecoinAddressFormat.Deprecated })

    describe('isValidAddress', () => {
      it('should return true for legacy address', async () => {
        expect(puDeprecated.isValidAddress(ADDRESS_LEGACY)).toBe(true)
      })
      it('should return false for modern p2sh segwit address', async () => {
        expect(puDeprecated.isValidAddress(ADDRESS_SEGWIT_P2SH)).toBe(false)
      })
      it('should return true for deprecated p2sh segwit address', async () => {
        expect(puDeprecated.isValidAddress(ADDRESS_SEGWIT_P2SH_DEPRECATED)).toBe(true)
      })
      it('should return true for native segwit address', async () => {
        expect(puDeprecated.isValidAddress(ADDRESS_SEGWIT_NATIVE)).toBe(true)
      })
      it('should return false for invalid', async () => {
        expect(puDeprecated.isValidAddress('fake')).toBe(false)
      })
    })

    describe('standardizeAddress', () => {
      it('should return same address for legacy address', async () => {
        expect(puDeprecated.standardizeAddress(ADDRESS_LEGACY)).toBe(ADDRESS_LEGACY)
      })
      it('should return deprecated p2sh address for modern p2sh segwit address', async () => {
        expect(puDeprecated.standardizeAddress(ADDRESS_SEGWIT_P2SH)).toBe(ADDRESS_SEGWIT_P2SH_DEPRECATED)
      })
      it('should return same address for deprecated p2sh segwit address', async () => {
        expect(puDeprecated.standardizeAddress(ADDRESS_SEGWIT_P2SH_DEPRECATED)).toBe(ADDRESS_SEGWIT_P2SH_DEPRECATED)
      })
      it('should return same address for native segwit address', async () => {
        expect(puDeprecated.standardizeAddress(ADDRESS_SEGWIT_NATIVE)).toBe(ADDRESS_SEGWIT_NATIVE)
      })
      it('should return null for invalid address', async () => {
        expect(puDeprecated.standardizeAddress('fake')).toBe(null)
      })
    })
  })
})
