import { createUnitConverters } from '../src/utils'
import { BigNumber } from '../src/SharedDependencies'
const MAIN_STRING = '1234567.1234567'
const MAIN_NUMBER = 1234567.1234567
const MAIN_BIGNUMBER = new BigNumber(MAIN_STRING)

const BASE_STRING = '123456712345670'
const BASE_NUMBER = 123456712345670
const BASE_BIGNUMBER = new BigNumber(BASE_STRING)

describe('utils', () => {
  describe('createUnitConverters', () => {
    const {
      toMainDenominationBigNumber,
      toMainDenominationNumber,
      toMainDenominationString,
      toBaseDenominationBigNumber,
      toBaseDenominationNumber,
      toBaseDenominationString,
    } = createUnitConverters(8)

    test('toMainDenominationBigNumber from string', () => {
      expect(toMainDenominationBigNumber(BASE_STRING)).toEqual(MAIN_BIGNUMBER)
    })
    test('toMainDenominationBigNumber from number', () => {
      expect(toMainDenominationBigNumber(BASE_NUMBER)).toEqual(MAIN_BIGNUMBER)
    })

    test('toMainDenominationString from BigNumber', () => {
      expect(toMainDenominationString(BASE_BIGNUMBER)).toEqual(MAIN_STRING)
    })
    test('toMainDenominationString from number', () => {
      expect(toMainDenominationString(BASE_NUMBER)).toEqual(MAIN_STRING)
    })

    test('toMainDenominationNumber from string', () => {
      expect(toMainDenominationNumber(BASE_STRING)).toEqual(MAIN_NUMBER)
    })
    test('toMainDenominationNumber from BigNumber', () => {
      expect(toMainDenominationNumber(BASE_BIGNUMBER)).toEqual(MAIN_NUMBER)
    })

    test('toBaseDenominationBigNumber from string', () => {
      expect(toBaseDenominationBigNumber(MAIN_STRING)).toEqual(BASE_BIGNUMBER)
    })
    test('toBaseDenominationBigNumber from number', () => {
      expect(toBaseDenominationBigNumber(MAIN_NUMBER)).toEqual(BASE_BIGNUMBER)
    })

    test('toBaseDenominationString from BigNumber', () => {
      expect(toBaseDenominationString(MAIN_BIGNUMBER)).toEqual(BASE_STRING)
    })
    test('toBaseDenominationString from number', () => {
      expect(toBaseDenominationString(MAIN_NUMBER)).toEqual(BASE_STRING)
    })

    test('toBaseDenominationNumber from string', () => {
      expect(toBaseDenominationNumber(MAIN_STRING)).toEqual(BASE_NUMBER)
    })
    test('toBaseDenominationNumber from BigNumber', () => {
      expect(toBaseDenominationNumber(MAIN_BIGNUMBER)).toEqual(BASE_NUMBER)
    })
  })
})
