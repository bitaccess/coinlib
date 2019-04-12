import { toMainDenomination, toBaseDenomination, isValidXpub, isValidXprv } from '#/utils'
import { hdAccount } from './fixtures/accounts'

const { XPRV, XPUB } = hdAccount

describe('utils', () => {
  test('toMainDenomination from string', () => {
    expect(toMainDenomination('123456789')).toBe('123.456789')
  })
  test('toMainDenomination from number', () => {
    expect(toMainDenomination(123456789)).toBe('123.456789')
  })
  test('toBaseDenomination from string', () => {
    expect(toBaseDenomination('123.456789')).toBe('123456789')
  })
  test('toBaseDenomination from number', () => {
    expect(toBaseDenomination(123.456789)).toBe('123456789')
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
})
