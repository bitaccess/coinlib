import { estimateBitcoinTxSize } from '../src/utils'
import { AddressType } from '../src'

const { Legacy } = AddressType

describe('utils', () => {
  describe('estimateBitcoinTxSize', () => {
    it(`returns correct estimate for ${Legacy} sweep`, () => {
      expect(estimateBitcoinTxSize({ [Legacy]: 1 }, { [Legacy]: 1 }))
        .toBe(192)
    })
    it(`returns correct estimate for ${Legacy} 2 to 2`, () => {
      expect(estimateBitcoinTxSize({ [Legacy]: 2 }, { [Legacy]: 2 }))
        .toBe(374)
    })
  })
})
