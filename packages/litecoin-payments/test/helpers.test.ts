import {
  toMainDenominationString,
  toBaseDenominationString,
  isValidAddress,
  LitecoinAddressFormat,
  standardizeAddress,
  estimateLitecoinTxSize,
  AddressType,
} from '../src'
import {
  ADDRESS_LEGACY, ADDRESS_SEGWIT_NATIVE, ADDRESS_SEGWIT_P2SH, ADDRESS_SEGWIT_P2SH_DEPRECATED, NETWORK, NETWORK_TYPE,
} from './fixtures'

const { Legacy, SegwitP2SH, SegwitNative } = AddressType

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

  describe('estimateLitecoinTxSize', () => {
    it(`returns correct estimate for ${Legacy} sweep`, () => {
      expect(estimateLitecoinTxSize({ [Legacy]: 1 }, { [Legacy]: 1 }, NETWORK_TYPE))
        .toBe(192)
    })
    it(`returns correct estimate for ${SegwitP2SH} sweep`, () => {
      expect(estimateLitecoinTxSize({ [SegwitP2SH]: 1 }, { [SegwitP2SH]: 1 }, NETWORK_TYPE))
        .toBe(133)
    })
    it(`returns correct estimate for ${SegwitNative} sweep`, () => {
      expect(estimateLitecoinTxSize({ [SegwitNative]: 1 }, { [SegwitNative]: 1 }, NETWORK_TYPE))
        .toBe(109)
    })
    it(`returns correct estimate for ${Legacy} 2 to 2`, () => {
      expect(estimateLitecoinTxSize({ [Legacy]: 2 }, { [Legacy]: 2 }, NETWORK_TYPE))
        .toBe(374)
    })
    it(`returns correct estimate for ${SegwitP2SH} 2 to 2`, () => {
      expect(estimateLitecoinTxSize({ [SegwitP2SH]: 2 }, { [SegwitP2SH]: 2 }, NETWORK_TYPE))
        .toBe(256)
    })
    it(`returns correct estimate for ${SegwitNative} 2 to 2`, () => {
      expect(estimateLitecoinTxSize({ [SegwitNative]: 2 }, { [SegwitNative]: 2 }, NETWORK_TYPE))
        .toBe(208)
    })
    it(`returns correct estimate for ${SegwitNative} 3 to 5 mixed addresses`, () => {
      expect(estimateLitecoinTxSize({ [SegwitNative]: 3 }, {
        [ADDRESS_LEGACY]: 1,
        [ADDRESS_SEGWIT_P2SH_DEPRECATED]: 1,
        [ADDRESS_SEGWIT_NATIVE]: 1,
      }, NETWORK_TYPE))
        .toBe(311)
    })
  })
})
