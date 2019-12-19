import {
  toMainDenominationString, toBaseDenominationString, isValidXpub, isValidXprv, isValidAddress,
} from '../src'
import { hdAccount } from './fixtures/accounts'

const { XPRV, XPUB, ADDRESSES } = hdAccount

describe('utils', () => {
  test('toMainDenomination from string', () => {
    expect(toMainDenominationString('123456789')).toBe('123.456789')
  })
  test('toMainDenomination from number', () => {
    expect(toMainDenominationString(123456789)).toBe('123.456789')
  })
  test('toBaseDenomination from string', () => {
    expect(toBaseDenominationString('123.456789')).toBe('123456789')
  })
  test('toBaseDenomination from number', () => {
    expect(toBaseDenominationString(123.456789)).toBe('123456789')
  })
  test('isValidXpub should return true for valid', () => {
    expect(isValidXpub(XPUB)).toBe(true)
  })
  test('isValidXpub should return true for valid', () => {
    expect(isValidXpub('xpat1234')).toBe(false)
  })
  test('isValidXrv should return true for valid', () => {
    expect(isValidXprv(XPRV)).toBe(true)
  })
  test('isValidXrv should return false for invalid', () => {
    expect(isValidXprv('xpat1234')).toBe(false)
  })
  test('isValidAddress shoudl return true for valid', async () => {
    expect(isValidAddress(ADDRESSES[0])).toBe(true)
  })
  test('isValidAddress shoudl return true for valid', async () => {
    expect(isValidAddress('fake')).toBe(false)
  })
})
