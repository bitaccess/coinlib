import { estimateBitcoinTxSize } from '../src/utils'
import { AddressType } from '../src'

const { Legacy, SegwitP2SH, SegwitNative, MultisigLegacy, MultisigSegwitP2SH, MultisigSegwitNative } = AddressType

describe('utils', () => {
  describe('estimateBitcoinTxSize', () => {
    it(`returns correct estimate for ${Legacy} sweep`, () => {
      expect(estimateBitcoinTxSize({ [Legacy]: 1 }, { [Legacy]: 1 }))
        .toBe(192)
    })
    it(`returns correct estimate for ${SegwitP2SH} sweep`, () => {
      expect(estimateBitcoinTxSize({ [SegwitP2SH]: 1 }, { [SegwitP2SH]: 1 }))
        .toBe(133)
    })
    it(`returns correct estimate for ${SegwitNative} sweep`, () => {
      expect(estimateBitcoinTxSize({ [SegwitNative]: 1 }, { [SegwitNative]: 1 }))
        .toBe(109)
    })
    it(`returns correct estimate for ${MultisigLegacy}:2-2 sweep to ${Legacy}`, () => {
      expect(estimateBitcoinTxSize({ [`${MultisigLegacy}:2-2`]: 1 }, { [Legacy]: 1 }))
        .toBe(307)
    })
    it(`returns correct estimate for ${MultisigLegacy}:1-3 sweep to ${Legacy}`, () => {
      expect(estimateBitcoinTxSize({ [`${MultisigLegacy}:1-3`]: 1 }, { [Legacy]: 1 }))
        .toBe(268)
    })
    it(`returns correct estimate for ${MultisigSegwitP2SH}:2-2 sweep to ${SegwitP2SH}`, () => {
      expect(estimateBitcoinTxSize({ [`${MultisigSegwitP2SH}:2-2`]: 1 }, { [SegwitP2SH]: 1 }))
        .toBe(173)
    })
    it(`returns correct estimate for ${MultisigSegwitP2SH}:1-3 sweep to ${SegwitP2SH}`, () => {
      expect(estimateBitcoinTxSize({ [`${MultisigSegwitP2SH}:1-3`]: 1 }, { [SegwitP2SH]: 1 }))
        .toBe(164)
    })
    it(`returns correct estimate for ${MultisigSegwitNative}:2-2 sweep to ${SegwitNative}`, () => {
      expect(estimateBitcoinTxSize({ [`${MultisigSegwitNative}:2-2`]: 1 }, { [SegwitNative]: 1 }))
        .toBe(137)
    })
    it(`returns correct estimate for ${MultisigSegwitNative}:1-3 sweep to ${SegwitNative}`, () => {
      expect(estimateBitcoinTxSize({ [`${MultisigSegwitNative}:1-3`]: 1 }, { [SegwitNative]: 1 }))
        .toBe(128)
    })
    it(`returns correct estimate for ${Legacy} 2 to 2`, () => {
      expect(estimateBitcoinTxSize({ [Legacy]: 2 }, { [Legacy]: 2 }))
        .toBe(374)
    })
    it(`returns correct estimate for ${SegwitP2SH} 2 to 2`, () => {
      expect(estimateBitcoinTxSize({ [SegwitP2SH]: 2 }, { [SegwitP2SH]: 2 }))
        .toBe(256)
    })
    it(`returns correct estimate for ${SegwitNative} 2 to 2`, () => {
      expect(estimateBitcoinTxSize({ [SegwitNative]: 2 }, { [SegwitNative]: 2 }))
        .toBe(208)
    })
    it(`returns correct estimate for ${SegwitNative} 3 to 5 mixed addresses`, () => {
      expect(estimateBitcoinTxSize({ [SegwitNative]: 3 }, {
        '1J5d68gBGsNS8bxMGBnjCHorYCYGXQnM65': 1,
        '3A766zq5cpCq1yWCbZTjvFSC8FnXihhTVg': 1,
        'bc1qwgfsk5ylcevy6g638gcmaxqf8hu8jpxql7x9zt': 1,
        [MultisigSegwitNative]: 2,
      }))
        .toBe(397)
    })
  })
})
