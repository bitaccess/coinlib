import { splitDerivationPath } from '../src/HdKeyUtils'

export const DERIVATION_PATH = "m/44'/1337'/1'"

describe('HdKeyUtils', () => {

  describe('splitDerivationPath', () => {
    it('returns correct value', () => {
      expect(splitDerivationPath(DERIVATION_PATH)).toEqual(["44'", "1337'", "1'"])
    })
  })
})
