import {
  toMainDenominationString, toBaseDenominationString, isValidAddress,
} from '../src'
import {
  ADDRESS_VALID, NETWORK_TYPE,
} from './fixtures'

describe('helpers', () => {
  describe('toMainDenomination', () => {
    test('toMainDenomination from string', () => {
      expect(toMainDenominationString('123456789')).toBe('1.23456789')
    })
    test('toMainDenomination from number', () => {
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
    test('isValidAddress should return true for valid address', async () => {
      expect(isValidAddress(ADDRESS_VALID, NETWORK_TYPE)).toBe(true)
    })
    test('isValidAddress should return false for invalid', async () => {
      expect(isValidAddress('fake', NETWORK_TYPE)).toBe(false)
    })
  })

})
