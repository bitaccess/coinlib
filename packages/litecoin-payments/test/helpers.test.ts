import {
  toMainDenominationString, toBaseDenominationString, isValidAddress,
} from '../src'
import {
  ADDRESS_LEGACY, ADDRESS_SEGWIT_NATIVE, ADDRESS_SEGWIT_P2SH, NETWORK,
} from './fixtures'

describe('helpers', () => {
  test('toMainDenomination from string', () => {
    expect(toMainDenominationString('123456789')).toBe('1.23456789')
  })
  test('toMainDenomination from number', () => {
    expect(toMainDenominationString(123456789)).toBe('1.23456789')
  })
  test('toBaseDenomination from string', () => {
    expect(toBaseDenominationString('1.23456789')).toBe('123456789')
  })
  test('toBaseDenomination from number', () => {
    expect(toBaseDenominationString(1.23456789)).toBe('123456789')
  })
  test('isValidAddress should return true for valid legacy address', async () => {
    expect(isValidAddress(ADDRESS_LEGACY, NETWORK)).toBe(true)
  })
  test('isValidAddress should return true for valid p2sh segwit address', async () => {
    expect(isValidAddress(ADDRESS_SEGWIT_P2SH, NETWORK)).toBe(true)
  })
  test('isValidAddress should return true for valid native segwit address', async () => {
    expect(isValidAddress(ADDRESS_SEGWIT_NATIVE, NETWORK)).toBe(true)
  })
  test('isValidAddress should return false for invalid', async () => {
    expect(isValidAddress('fake', NETWORK)).toBe(false)
  })
})
