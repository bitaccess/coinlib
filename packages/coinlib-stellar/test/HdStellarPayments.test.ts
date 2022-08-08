import { HdStellarPayments } from '../src'
import { commonTests } from './helper'
import { hdAccount } from './fixtures/accounts'
import * as bip39 from 'bip39'

const { MNEMONIC, SEED, NEW_DERIVATION_PATH, ADDRESSES, SECRETS, NEW_ADDRESSES, NEW_SECRETS } = hdAccount

describe('HdStellarPayments', () => {
  describe('static', () => {
    it('generateMnemonic should return valid mnemonic', async () => {
      const mnemonic = HdStellarPayments.generateMnemonic()
      expect(bip39.validateMnemonic(mnemonic)).toBe(true)
    })
    it('should throw on invalid seed', () => {
      expect(() => new HdStellarPayments({ seed: 123 as any })).toThrow()
    })
    it('should instantiate with valid mnemonic', () => {
      const rp = new HdStellarPayments({ seed: MNEMONIC })
      expect(rp).toBeInstanceOf(HdStellarPayments)
    })
    it('should instantiate with valid xpub', () => {
      const rp = new HdStellarPayments({ seed: SEED })
      expect(rp).toBeInstanceOf(HdStellarPayments)
    })
  })
  describe('mnemonic', () => {
    const rp = new HdStellarPayments({ seed: MNEMONIC })
    commonTests(rp, ADDRESSES, SECRETS)
  })
  describe('mnemonic with derivation path', () => {
    const rp = new HdStellarPayments({ seed: MNEMONIC, derivationPath: NEW_DERIVATION_PATH })
    commonTests(rp, NEW_ADDRESSES, NEW_SECRETS)
  })
  describe('seed', () => {
    const rp = new HdStellarPayments({ seed: SEED })
    commonTests(rp, ADDRESSES, SECRETS)
  })
  describe('seed with derivation path', () => {
    const rp = new HdStellarPayments({ seed: SEED, derivationPath: NEW_DERIVATION_PATH })
    commonTests(rp, NEW_ADDRESSES, NEW_SECRETS)
  })
})
