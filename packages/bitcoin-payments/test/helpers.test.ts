import {
  toMainDenominationString, toBaseDenominationString, isValidXpub, isValidXprv, isValidAddress,
} from '../src'
import {
  DERIVED_XPRV, DERIVED_XPUB, ADDRESS_LEGACY, ADDRESS_SEGWIT_NATIVE, ADDRESS_SEGWIT_P2SH, NETWORK,
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
  test('isValidXpub should return true for valid', () => {
    expect(isValidXpub(DERIVED_XPUB, NETWORK)).toBe(true)
  })
  test('isValidXpub should return false for invalid', () => {
    expect(isValidXpub('xpat1234', NETWORK)).toBe(false)
  })
  test('isValidXprv should return true for valid', () => {
    expect(isValidXprv(DERIVED_XPRV, NETWORK)).toBe(true)
  })
  test('isValidXprv should return false for invalid', () => {
    expect(isValidXprv('xpat1234', NETWORK)).toBe(false)
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
