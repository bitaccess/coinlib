import {
  toMainDenominationString, toBaseDenominationString, isValidAddress, estimateBitcoinTxSize, AddressType,
} from '../src'
import {
  ADDRESS_LEGACY, ADDRESS_SEGWIT_NATIVE, ADDRESS_SEGWIT_P2SH, NETWORK_TYPE, NETWORK,
} from './fixtures'

const { Legacy, SegwitP2SH, SegwitNative, MultisigLegacy, MultisigSegwitP2SH, MultisigSegwitNative } = AddressType

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
    test('should return true for valid legacy address', async () => {
      expect(isValidAddress(ADDRESS_LEGACY, NETWORK_TYPE)).toBe(true)
    })
    test('should return true for valid p2sh segwit address', async () => {
      expect(isValidAddress(ADDRESS_SEGWIT_P2SH, NETWORK_TYPE)).toBe(true)
    })
    test('should return true for valid native segwit address', async () => {
      expect(isValidAddress(ADDRESS_SEGWIT_NATIVE, NETWORK_TYPE)).toBe(true)
    })
    test('should return false for invalid', async () => {
      expect(isValidAddress('fake', NETWORK_TYPE)).toBe(false)
    })
  })

  describe('estimateBitcoinTxSize', () => {
    it(`returns correct estimate for ${Legacy} sweep`, () => {
      expect(estimateBitcoinTxSize({ [Legacy]: 1 }, { [Legacy]: 1 }, NETWORK_TYPE))
        .toBe(192)
    })
    it(`returns correct estimate for ${SegwitP2SH} sweep`, () => {
      expect(estimateBitcoinTxSize({ [SegwitP2SH]: 1 }, { [SegwitP2SH]: 1 }, NETWORK_TYPE))
        .toBe(133)
    })
    it(`returns correct estimate for ${SegwitNative} sweep`, () => {
      expect(estimateBitcoinTxSize({ [SegwitNative]: 1 }, { [SegwitNative]: 1 }, NETWORK_TYPE))
        .toBe(109)
    })
    it(`returns correct estimate for ${MultisigLegacy}:2-2 sweep to ${Legacy}`, () => {
      expect(estimateBitcoinTxSize({ [`${MultisigLegacy}:2-2`]: 1 }, { [Legacy]: 1 }, NETWORK_TYPE))
        .toBe(307)
    })
    it(`returns correct estimate for ${MultisigLegacy}:1-3 sweep to ${Legacy}`, () => {
      expect(estimateBitcoinTxSize({ [`${MultisigLegacy}:1-3`]: 1 }, { [Legacy]: 1 }, NETWORK_TYPE))
        .toBe(268)
    })
    it(`returns correct estimate for ${MultisigSegwitP2SH}:2-2 sweep to ${SegwitP2SH}`, () => {
      expect(estimateBitcoinTxSize({ [`${MultisigSegwitP2SH}:2-2`]: 1 }, { [SegwitP2SH]: 1 }, NETWORK_TYPE))
        .toBe(173)
    })
    it(`returns correct estimate for ${MultisigSegwitP2SH}:1-3 sweep to ${SegwitP2SH}`, () => {
      expect(estimateBitcoinTxSize({ [`${MultisigSegwitP2SH}:1-3`]: 1 }, { [SegwitP2SH]: 1 }, NETWORK_TYPE))
        .toBe(164)
    })
    it(`returns correct estimate for ${MultisigSegwitNative}:2-2 sweep to ${SegwitNative}`, () => {
      expect(estimateBitcoinTxSize({ [`${MultisigSegwitNative}:2-2`]: 1 }, { [SegwitNative]: 1 }, NETWORK_TYPE))
        .toBe(137)
    })
    it(`returns correct estimate for ${MultisigSegwitNative}:1-3 sweep to ${SegwitNative}`, () => {
      expect(estimateBitcoinTxSize({ [`${MultisigSegwitNative}:1-3`]: 1 }, { [SegwitNative]: 1 }, NETWORK_TYPE))
        .toBe(128)
    })
    it(`returns correct estimate for ${Legacy} 2 to 2`, () => {
      expect(estimateBitcoinTxSize({ [Legacy]: 2 }, { [Legacy]: 2 }, NETWORK_TYPE))
        .toBe(374)
    })
    it(`returns correct estimate for ${SegwitP2SH} 2 to 2`, () => {
      expect(estimateBitcoinTxSize({ [SegwitP2SH]: 2 }, { [SegwitP2SH]: 2 }, NETWORK_TYPE))
        .toBe(256)
    })
    it(`returns correct estimate for ${SegwitNative} 2 to 2`, () => {
      expect(estimateBitcoinTxSize({ [SegwitNative]: 2 }, { [SegwitNative]: 2 }, NETWORK_TYPE))
        .toBe(208)
    })
    it(`returns correct estimate for ${SegwitNative} 3 to 5 mixed addresses`, () => {
      expect(estimateBitcoinTxSize({ [SegwitNative]: 3 }, {
        '1J5d68gBGsNS8bxMGBnjCHorYCYGXQnM65': 1,
        '3A766zq5cpCq1yWCbZTjvFSC8FnXihhTVg': 1,
        'bc1qwgfsk5ylcevy6g638gcmaxqf8hu8jpxql7x9zt': 1,
        [MultisigSegwitNative]: 2,
      }, NETWORK_TYPE))
        .toBe(397)
    })
  })
})
