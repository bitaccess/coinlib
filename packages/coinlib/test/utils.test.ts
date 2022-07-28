import { getSeedHexFromMnemonic, getFingerprintFromSeedHex } from '../src/utils'
import { MNEMONIC, SEED_HEX, FINGERPRINT } from './fixtures/utils'

describe('utils', () => {
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
