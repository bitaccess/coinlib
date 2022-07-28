import { keysOf, getSeedHexFromMnemonic, getFingerprintFromSeedHex } from '../src/utils'
import { MNEMONIC, SEED_HEX, FINGERPRINT } from './fixtures/utils'

describe('utils', () => {
  describe('keysOf', () => {
    it('works', () => {
      const result: ('a' | 'b' | 'c')[] = keysOf({ a: 1, b: 2, c: 5 })
      expect(result).toEqual(['a', 'b', 'c'])
    })
  })

  describe('getSeedHexFromMnemonic', () => {
    it('works', () => {
      const seedHex = getSeedHexFromMnemonic(MNEMONIC)
      expect(seedHex).toBe(SEED_HEX)
    })
  })

  describe('getFingerprintFromSeedHex', () => {
    it('works', () => {
      const fingerprint = getFingerprintFromSeedHex(SEED_HEX)
      expect(fingerprint).toBe(FINGERPRINT)
    })
  })
})
