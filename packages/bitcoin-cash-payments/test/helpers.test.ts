import {
  toMainDenominationString, toBaseDenominationString, isValidAddress, BitcoinCashAddressFormat,
  estimateBitcoinCashTxSize, bitcoinish,
} from '../src'

const { Legacy } = bitcoinish.AddressType
import { NETWORK, NETWORK_TYPE, ADDRESS_CASH, ADDRESS_BITPAY, ADDRESS_LEGACY } from './fixtures'

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
      test('should return true for valid cash address', async () => {
        expect(isValidAddress(ADDRESS_CASH, NETWORK_TYPE)).toBe(true)
      })
      test('should return true for valid bitpay address', async () => {
        expect(isValidAddress(ADDRESS_BITPAY, NETWORK_TYPE)).toBe(true)
      })
      test('should return true for valid legacy address', async () => {
        expect(isValidAddress(ADDRESS_LEGACY, NETWORK_TYPE)).toBe(true)
      })
      test('should return false for invalid', async () => {
        expect(isValidAddress('fake', NETWORK_TYPE)).toBe(false)
      })
    })
    describe('cash format', () => {
      const options = { format: BitcoinCashAddressFormat.Cash }
      test('should return true for valid cash address', async () => {
        expect(isValidAddress(ADDRESS_CASH, NETWORK_TYPE, options)).toBe(true)
      })
      test('should return false for valid bitpay address', async () => {
        expect(isValidAddress(ADDRESS_BITPAY, NETWORK_TYPE, options)).toBe(false)
      })
      test('should return false for valid legacy address', async () => {
        expect(isValidAddress(ADDRESS_LEGACY, NETWORK_TYPE, options)).toBe(false)
      })
      test('should return false for invalid', async () => {
        expect(isValidAddress('fake', NETWORK_TYPE, options)).toBe(false)
      })
    })
    describe('bitpay format', () => {
      const options = { format: BitcoinCashAddressFormat.BitPay  }
      test('should return false for valid cash address', async () => {
        expect(isValidAddress(ADDRESS_CASH, NETWORK_TYPE, options)).toBe(false)
      })
      test('should return true for valid bitpay address', async () => {
        expect(isValidAddress(ADDRESS_BITPAY, NETWORK_TYPE, options)).toBe(true)
      })
      test('should return false for valid legacy address', async () => {
        expect(isValidAddress(ADDRESS_LEGACY, NETWORK_TYPE, options)).toBe(false)
      })
      test('should return false for invalid', async () => {
        expect(isValidAddress('fake', NETWORK_TYPE, options)).toBe(false)
      })
    })
    describe('legacy format', () => {
      const options = { format: BitcoinCashAddressFormat.Legacy }
      test('should return false for valid cash address', async () => {
        expect(isValidAddress(ADDRESS_CASH, NETWORK_TYPE, options)).toBe(false)
      })
      test('should return false for valid bitpay address', async () => {
        expect(isValidAddress(ADDRESS_BITPAY, NETWORK_TYPE, options)).toBe(false)
      })
      test('should return true for valid legacy address', async () => {
        expect(isValidAddress(ADDRESS_LEGACY, NETWORK_TYPE, options)).toBe(true)
      })
      test('should return false for invalid', async () => {
        expect(isValidAddress('fake', NETWORK_TYPE, options)).toBe(false)
      })
    })
  })

  describe('estimateBitcoinTxSize', () => {
    it(`returns correct estimate for ${Legacy} sweep`, () => {
      expect(estimateBitcoinCashTxSize({ [Legacy]: 1 }, { [Legacy]: 1 }, NETWORK))
        .toBe(192)
    })
    it(`returns correct estimate for ${Legacy} 2 to 2`, () => {
      expect(estimateBitcoinCashTxSize({ [Legacy]: 2 }, { [Legacy]: 2 }, NETWORK))
        .toBe(374)
    })
  })
})
