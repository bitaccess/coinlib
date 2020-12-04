import {
  toMainDenominationString, toBaseDenominationString, isValidAddress, LitecoinAddressFormat, standardizeAddress,
} from '../src'
import {
  ADDRESS_LEGACY, ADDRESS_SEGWIT_NATIVE, ADDRESS_SEGWIT_P2SH, ADDRESS_SEGWIT_P2SH_DEPRECATED, NETWORK_TYPE,
} from './fixtures'

describe('helpers', () => {
  describe('toMainDenomination', () => {
    test('from string', () => {
      expect(toMainDenominationString('123456789')).toBe('1.23456789')
    })
    test('from number', () => {
      expect(toMainDenominationString(123456789)).toBe('1.23456789')
    })
  })

  describe('toBaseDenomination', () => {
    test('from string', () => {
      expect(toBaseDenominationString('1.23456789')).toBe('123456789')
    })
    test('from number', () => {
      expect(toBaseDenominationString(1.23456789)).toBe('123456789')
    })
  })

  describe('isValidAddress', () => {
    describe('unspecified format', () => {
      test('should return true for valid legacy address', async () => {
        expect(isValidAddress(ADDRESS_LEGACY, NETWORK_TYPE)).toBe(true)
      })
      test('should return true for valid modern p2sh segwit address', async () => {
        expect(isValidAddress(ADDRESS_SEGWIT_P2SH, NETWORK_TYPE)).toBe(true)
      })
      test('should return true for valid deprecated p2sh segwit address', async () => {
        expect(isValidAddress(ADDRESS_SEGWIT_P2SH_DEPRECATED, NETWORK_TYPE)).toBe(true)
      })
      test('should return true for valid native segwit address', async () => {
        expect(isValidAddress(ADDRESS_SEGWIT_NATIVE, NETWORK_TYPE)).toBe(true)
      })
      test('should return false for invalid address', async () => {
        expect(isValidAddress('fake', NETWORK_TYPE)).toBe(false)
      })
    })
    describe('deprecated format', () => {
      const options = { format: LitecoinAddressFormat.Deprecated }
      test('should return true for valid legacy address', async () => {
        expect(isValidAddress(ADDRESS_LEGACY, NETWORK_TYPE, options)).toBe(true)
      })
      test('should return false for valid modern p2sh segwit address', async () => {
        expect(isValidAddress(ADDRESS_SEGWIT_P2SH, NETWORK_TYPE, options)).toBe(false)
      })
      test('should return true for valid deprecated p2sh segwit address', async () => {
        expect(isValidAddress(ADDRESS_SEGWIT_P2SH_DEPRECATED, NETWORK_TYPE, options)).toBe(true)
      })
      test('should return true for valid native segwit address', async () => {
        expect(isValidAddress(ADDRESS_SEGWIT_NATIVE, NETWORK_TYPE, options)).toBe(true)
      })
      test('should return false for invalid address', async () => {
        expect(isValidAddress('fake', NETWORK_TYPE, options)).toBe(false)
      })
    })
    describe('modern format', () => {
      const options = { format: LitecoinAddressFormat.Modern }
      test('should return true for valid legacy address', async () => {
        expect(isValidAddress(ADDRESS_LEGACY, NETWORK_TYPE, options)).toBe(true)
      })
      test('should return true for valid modern p2sh segwit address', async () => {
        expect(isValidAddress(ADDRESS_SEGWIT_P2SH, NETWORK_TYPE, options)).toBe(true)
      })
      test('should return false for valid deprecated p2sh segwit address', async () => {
        expect(isValidAddress(ADDRESS_SEGWIT_P2SH_DEPRECATED, NETWORK_TYPE, options)).toBe(false)
      })
      test('should return true for valid native segwit address', async () => {
        expect(isValidAddress(ADDRESS_SEGWIT_NATIVE, NETWORK_TYPE, options)).toBe(true)
      })
      test('should return false for invalid address', async () => {
        expect(isValidAddress('fake', NETWORK_TYPE, options)).toBe(false)
      })
    })
  })

  describe('standardizeAddress', () => {
    describe('unspecified format', () => {
      test('should return same address for valid legacy address', async () => {
        expect(standardizeAddress(ADDRESS_LEGACY, NETWORK_TYPE)).toBe(ADDRESS_LEGACY)
      })
      test('should return same address for valid modern p2sh segwit address', async () => {
        expect(standardizeAddress(ADDRESS_SEGWIT_P2SH, NETWORK_TYPE)).toBe(ADDRESS_SEGWIT_P2SH)
      })
      test('should return modern address for valid deprecated p2sh segwit address', async () => {
        expect(standardizeAddress(ADDRESS_SEGWIT_P2SH_DEPRECATED, NETWORK_TYPE)).toBe(ADDRESS_SEGWIT_P2SH)
      })
      test('should return same address for valid native segwit address', async () => {
        expect(standardizeAddress(ADDRESS_SEGWIT_NATIVE, NETWORK_TYPE)).toBe(ADDRESS_SEGWIT_NATIVE)
      })
      test('should return null for invalid address', async () => {
        expect(standardizeAddress('fake', NETWORK_TYPE)).toBe(null)
      })
    })
    describe('modern format', () => {
      const options = { format: LitecoinAddressFormat.Modern }
      test('should return same address for valid legacy address', async () => {
        expect(standardizeAddress(ADDRESS_LEGACY, NETWORK_TYPE, options)).toBe(ADDRESS_LEGACY)
      })
      test('should return same address for valid modern p2sh segwit address', async () => {
        expect(standardizeAddress(ADDRESS_SEGWIT_P2SH, NETWORK_TYPE, options)).toBe(ADDRESS_SEGWIT_P2SH)
      })
      test('should return modern address for valid deprecated p2sh segwit address', async () => {
        expect(standardizeAddress(ADDRESS_SEGWIT_P2SH_DEPRECATED, NETWORK_TYPE, options)).toBe(ADDRESS_SEGWIT_P2SH)
      })
      test('should return same address for valid native segwit address', async () => {
        expect(standardizeAddress(ADDRESS_SEGWIT_NATIVE, NETWORK_TYPE, options)).toBe(ADDRESS_SEGWIT_NATIVE)
      })
      test('should return null for invalid address', async () => {
        expect(standardizeAddress('fake', NETWORK_TYPE, options)).toBe(null)
      })
    })
    describe('deprecated format', () => {
      const options = { format: LitecoinAddressFormat.Deprecated }
      test('should return same address for valid legacy address', async () => {
        expect(standardizeAddress(ADDRESS_LEGACY, NETWORK_TYPE, options)).toBe(ADDRESS_LEGACY)
      })
      test('should return deprecated address for valid modern p2sh segwit address', async () => {
        expect(standardizeAddress(ADDRESS_SEGWIT_P2SH, NETWORK_TYPE, options)).toBe(ADDRESS_SEGWIT_P2SH_DEPRECATED)
      })
      test('should return same address for valid deprecated p2sh segwit address', async () => {
        expect(standardizeAddress(ADDRESS_SEGWIT_P2SH_DEPRECATED, NETWORK_TYPE, options))
          .toBe(ADDRESS_SEGWIT_P2SH_DEPRECATED)
      })
      test('should return same address for valid native segwit address', async () => {
        expect(standardizeAddress(ADDRESS_SEGWIT_NATIVE, NETWORK_TYPE, options)).toBe(ADDRESS_SEGWIT_NATIVE)
      })
      test('should return null for invalid address', async () => {
        expect(standardizeAddress('fake', NETWORK_TYPE, options)).toBe(null)
      })
    })
  })
})
