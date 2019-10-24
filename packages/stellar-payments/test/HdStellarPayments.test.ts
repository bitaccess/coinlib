import { HdStellarPayments } from '../src'
import { hdAccount } from './fixtures/accounts'
import * as bip39 from 'bip39';

const { MNEMONIC, SEED, ADDRESSES, SECRETS } = hdAccount

function commonTests(payments: HdStellarPayments) {
  it('should not be readonly', () => {
    expect(payments.isReadOnly()).toBe(false)
  })
  it('getHotSignatory should return correct key pair', () => {
    const hotSignatory = payments.getHotSignatory()
    expect(hotSignatory.address).toBe(ADDRESSES[0])
    expect(hotSignatory.secret).toEqual(SECRETS[0])
  })
  it('getDepositSignatory should return correct key pair', () => {
    const hotSignatory = payments.getDepositSignatory()
    expect(hotSignatory.address).toBe(ADDRESSES[1])
    expect(hotSignatory.secret).toEqual(SECRETS[1])
  })
  it('getPublicConfig should return signatories', () => {
    const publicConfig = payments.getPublicConfig()
    expect(publicConfig).toEqual({
      hotAccount: ADDRESSES[0],
      depositAccount: ADDRESSES[1],
    })
  })
  it('getAccountIds should return addresses', () => {
    expect(payments.getAccountIds()).toEqual([ADDRESSES[0], ADDRESSES[1]])
  })
  describe('getAccountId', () => {
    it('should return address 0 for index 0', () => {
      expect(payments.getAccountId(0)).toBe(ADDRESSES[0])
    })
    for (let i = 1; i < 5; i++) {
      it(`should return address 1 for index ${i}`, () => {
        expect(payments.getAccountId(i)).toBe(ADDRESSES[1])
      })
    }
  })
}

describe('HdStellarPayments', () => {
  describe('static', () => {
    it('generateMnemonic should return valid mnemonic', async () => {
      let mnemonic = HdStellarPayments.generateMnemonic()
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
    let rp = new HdStellarPayments({ seed: MNEMONIC })
    commonTests(rp)
  })
  describe('seed', () => {
    let rp = new HdStellarPayments({ seed: SEED })
    commonTests(rp)
  })
})
