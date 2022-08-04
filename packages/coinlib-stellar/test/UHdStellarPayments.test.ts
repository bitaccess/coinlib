import { UHdStellarPayments } from '../src'
import { hdAccount } from './fixtures/accounts'
import * as bip39 from 'bip39'

const { MNEMONIC, SEED, NEW_DERIVATION_PATH, ADDRESSES, SECRETS, NEW_ADDRESSES, NEW_SECRETS } = hdAccount

function seedPaymentTests(
  payments: UHdStellarPayments,
  addresses: { [key: number]: string },
  secrets: { [key: number]: string },
) {
  it('should not be readonly', () => {
    expect(payments.isReadOnly()).toBe(false)
  })
  it('getHotSignatory should return correct key pair', () => {
    const hotSignatory = payments.getHotSignatory()
    expect(hotSignatory.address).toBe(addresses[0])
    expect(hotSignatory.secret).toEqual(secrets[0])
  })
  it('getDepositSignatory should return correct key pair', () => {
    const hotSignatory = payments.getDepositSignatory()
    expect(hotSignatory.address).toBe(addresses[1])
    expect(hotSignatory.secret).toEqual(secrets[1])
  })
  it('getPublicConfig should return signatories', () => {
    const publicConfig = payments.getPublicConfig()
    expect(publicConfig).toEqual({
      hotAccount: addresses[0],
      depositAccount: addresses[1],
    })
  })
  it('getAccountIds should return addresses', () => {
    expect(payments.getAccountIds()).toEqual([addresses[0], addresses[1]])
  })
  describe('getAccountId', () => {
    it('should return address 0 for index 0', () => {
      expect(payments.getAccountId(0)).toBe(addresses[0])
    })
    for (let i = 1; i < 5; i++) {
      it(`should return address 1 for index ${i}`, () => {
        expect(payments.getAccountId(i)).toBe(addresses[1])
      })
    }
  })
}

function uniPubKeyPaymentTests(
  payments: UHdStellarPayments,
  addresses: { [key: number]: string },
  secrets: { [key: number]: string },
) {
  it('should not be readonly', () => {
    expect(payments.isReadOnly()).toBe(true)
  })
  it('getHotSignatory should return correct key pair', () => {
    const hotSignatory = payments.getHotSignatory()
    expect(hotSignatory.address).toBe(addresses[0])
    expect(hotSignatory.secret).toEqual('')
  })
  it('getDepositSignatory should return correct key pair', () => {
    const hotSignatory = payments.getDepositSignatory()
    expect(hotSignatory.address).toBe(addresses[1])
    expect(hotSignatory.secret).toEqual('')
  })
  it('getPublicConfig should return signatories', () => {
    const publicConfig = payments.getPublicConfig()
    expect(publicConfig).toEqual({
      hotAccount: addresses[0],
      depositAccount: addresses[1],
    })
  })
  it('getAccountIds should return addresses', () => {
    expect(payments.getAccountIds()).toEqual([addresses[0], addresses[1]])
  })
  describe('getAccountId', () => {
    it('should return address 0 for index 0', () => {
      expect(payments.getAccountId(0)).toBe(addresses[0])
    })
    for (let i = 1; i < 5; i++) {
      it(`should return address 1 for index ${i}`, () => {
        expect(payments.getAccountId(i)).toBe(addresses[1])
      })
    }
  })
}

describe('UHdStellarPayments', () => {
  describe('static', () => {
    it('generateMnemonic should return valid mnemonic', async () => {
      const mnemonic = UHdStellarPayments.generateMnemonic()
      expect(bip39.validateMnemonic(mnemonic)).toBe(true)
    })
    it('should throw on invalid seed', () => {
      expect(() => new UHdStellarPayments({ seed: 123 as any })).toThrow()
    })
    it('should instantiate with valid mnemonic', () => {
      const rp = new UHdStellarPayments({ seed: MNEMONIC })
      expect(rp).toBeInstanceOf(UHdStellarPayments)
    })
    it('should instantiate with valid xpub', () => {
      const rp = new UHdStellarPayments({ seed: SEED })
      expect(rp).toBeInstanceOf(UHdStellarPayments)
    })
  })
  describe('mnemonic', () => {
    const rp = new UHdStellarPayments({ seed: MNEMONIC })
    seedPaymentTests(rp, ADDRESSES, SECRETS)
  })
  describe('mnemonic with derivation path', () => {
    const rp = new UHdStellarPayments({ seed: MNEMONIC, derivationPath: NEW_DERIVATION_PATH })
    seedPaymentTests(rp, NEW_ADDRESSES, NEW_SECRETS)
  })
  describe('seed', () => {
    const rp = new UHdStellarPayments({ seed: SEED })
    seedPaymentTests(rp, ADDRESSES, SECRETS)
  })
  describe('seed with derivation path', () => {
    const rp = new UHdStellarPayments({ seed: SEED, derivationPath: NEW_DERIVATION_PATH })
    seedPaymentTests(rp, NEW_ADDRESSES, NEW_SECRETS)
  })
  describe('uniPubKey', () => {
    const rp = new UHdStellarPayments({
      uniPubKey: `${NEW_ADDRESSES[0]}:${NEW_ADDRESSES[1]}`,
    })
    uniPubKeyPaymentTests(rp, NEW_ADDRESSES, NEW_SECRETS)
  })
  describe('uniPubKey with derivation path', () => {
    const rp = new UHdStellarPayments({
      uniPubKey: `${NEW_ADDRESSES[0]}:${NEW_ADDRESSES[1]}`,
      derivationPath: NEW_DERIVATION_PATH,
    })
    uniPubKeyPaymentTests(rp, NEW_ADDRESSES, NEW_SECRETS)
  })
})
