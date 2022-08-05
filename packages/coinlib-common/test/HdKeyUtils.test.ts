import { deriveHDNode } from '@bitaccess/coinlib-common';
import { splitDerivationPath } from '../src/HdKeyUtils'


describe('HdKeyUtils', () => {

  describe('splitDerivationPath', () => {
    it('returns correct value', () => {
      const derivationPath = "m/44'/1337'/1'"
      expect(splitDerivationPath(derivationPath)).toEqual(["44'", "1337'", "1'"])
    })
  })
  describe('deriveHDNode', () => {
    it('does nothing if path depth matches xpub depth', () => {
      const pathWithDepth5 = "m/44'/60'/0'/0/0"
      const xpubWithDepth5 = 'xpub6G7izREAqiUx62vvYbecBHWZVg99BDx3YtPq37BGCHrWt1EzrDsxd6fZUyZo2SjyXybknctAU7uh13RPWFfabBnsGGwV5danYtWTxxynsXi'
      expect(deriveHDNode(
        xpubWithDepth5,
        pathWithDepth5,
      ).toBase58()).toBe(xpubWithDepth5)
    })
    it('throws error if deriving to path shallower than key depth', () => {
      const pathWithDepth4 = "m/44'/60'/0'/0"
      const xpubWithDepth5 = 'xpub6G7izREAqiUx62vvYbecBHWZVg99BDx3YtPq37BGCHrWt1EzrDsxd6fZUyZo2SjyXybknctAU7uh13RPWFfabBnsGGwV5danYtWTxxynsXi'
      expect(() => deriveHDNode(
        xpubWithDepth5,
        pathWithDepth4,
      )).toThrow(`Cannot deriveHDNode to path ${pathWithDepth4} because hdKey depth (5) is already deeper`)
    })
  })
})
