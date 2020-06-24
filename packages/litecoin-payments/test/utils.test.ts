import { estimateLitecoinTxSize } from '../src/utils'
import { AddressType } from '../src'

const { Legacy, SegwitP2SH, SegwitNative } = AddressType

describe('utils', () => {
  describe('estimateLitecoinTxSize', () => {
    it(`returns correct estimate for ${Legacy} sweep`, () => {
      expect(estimateLitecoinTxSize({ [Legacy]: 1 }, { [Legacy]: 1 }))
        .toBe(192)
    })
    it(`returns correct estimate for ${SegwitP2SH} sweep`, () => {
      expect(estimateLitecoinTxSize({ [SegwitP2SH]: 1 }, { [SegwitP2SH]: 1 }))
        .toBe(133)
    })
    it(`returns correct estimate for ${SegwitNative} sweep`, () => {
      expect(estimateLitecoinTxSize({ [SegwitNative]: 1 }, { [SegwitNative]: 1 }))
        .toBe(109)
    })
    it(`returns correct estimate for ${Legacy} 2 to 2`, () => {
      expect(estimateLitecoinTxSize({ [Legacy]: 2 }, { [Legacy]: 2 }))
        .toBe(374)
    })
    it(`returns correct estimate for ${SegwitP2SH} 2 to 2`, () => {
      expect(estimateLitecoinTxSize({ [SegwitP2SH]: 2 }, { [SegwitP2SH]: 2 }))
        .toBe(256)
    })
    it(`returns correct estimate for ${SegwitNative} 2 to 2`, () => {
      expect(estimateLitecoinTxSize({ [SegwitNative]: 2 }, { [SegwitNative]: 2 }))
        .toBe(208)
    })
    it(`returns correct estimate for ${SegwitNative} 3 to 5 mixed addresses`, () => {
      expect(estimateLitecoinTxSize({ [SegwitNative]: 3 }, {
        '1J5d68gBGsNS8bxMGBnjCHorYCYGXQnM65': 1,
        '3A766zq5cpCq1yWCbZTjvFSC8FnXihhTVg': 1,
        'bc1qwgfsk5ylcevy6g638gcmaxqf8hu8jpxql7x9zt': 1,
      }))
        .toBe(311)
    })
  })
})
