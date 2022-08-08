import { UHdRipplePayments, XPUB_REGEX, XPRV_REGEX } from '../src'
import { hdAccount } from './fixtures/accounts'

const { SEED, XPUB, PRIVATE_KEYS, PUBLIC_KEYS, ADDRESSES } = hdAccount

function commonTests(rp: UHdRipplePayments) {
  it('getPublicConfig should return xpub', () => {
    const publicConfig = rp.getPublicConfig()
    expect(publicConfig.hdKey).toBe(XPUB)
  })
  it('getAccountIds should return xpub', () => {
    expect(rp.getAccountIds()).toEqual([XPUB])
  })
  describe('getAccountId', () => {
    for (let i = 0; i < 5; i++) {
      it(`should return xpub for index ${i}`, () => {
        expect(rp.getAccountId(i)).toBe(XPUB)
      })
    }
  })
}

describe('UHdRipplePayments', () => {
  describe('static', () => {
    it('generateNewKeys should return xprv and xpub', async () => {
      const keys = UHdRipplePayments.generateNewKeys()
      expect(keys.xpub).toMatch(XPUB_REGEX)
      expect(keys.xprv).toMatch(XPRV_REGEX)
    })
    it('should throw on invalid uniPubKey', () => {
      expect(() => new UHdRipplePayments({ uniPubKey: 'invalid' })).toThrow()
    })
    it('should instantiate with valid xprv', () => {
      const rp = new UHdRipplePayments({ seed: SEED })
      expect(rp).toBeInstanceOf(UHdRipplePayments)
    })
    it('should instantiate with valid xpub', () => {
      const rp = new UHdRipplePayments({ uniPubKey: XPUB })
      expect(rp).toBeInstanceOf(UHdRipplePayments)
    })
  })
  describe('xprv', () => {
    const rp = new UHdRipplePayments({ seed: SEED })
    it('should not be readonly', () => {
      expect(rp.isReadOnly()).toBe(false)
    })
    it('getHotSignatory should return correct key pair', () => {
      const hotSignatory = rp.getHotSignatory()
      expect(hotSignatory.address).toBe(ADDRESSES[0])
      expect(hotSignatory.secret).toEqual({ privateKey: PRIVATE_KEYS[0], publicKey: PUBLIC_KEYS[0] })
    })
    it('getDepositSignatory should return correct key pair', () => {
      const hotSignatory = rp.getDepositSignatory()
      expect(hotSignatory.address).toBe(ADDRESSES[1])
      expect(hotSignatory.secret).toEqual({ privateKey: PRIVATE_KEYS[1], publicKey: PUBLIC_KEYS[1] })
    })
    commonTests(rp)
  })
  describe('xpub', () => {
    const rp = new UHdRipplePayments({ uniPubKey: XPUB })
    it('should be readonly', () => {
      expect(rp.isReadOnly()).toBe(true)
    })
    it('getHotSignatory should return readonly key pair', () => {
      const hotSignatory = rp.getHotSignatory()
      expect(hotSignatory.address).toBe(ADDRESSES[0])
      expect(hotSignatory.secret).toEqual({ privateKey: '', publicKey: PUBLIC_KEYS[0] })
    })
    it('getDepositSignatory should return readonly key pair', () => {
      const hotSignatory = rp.getDepositSignatory()
      expect(hotSignatory.address).toBe(ADDRESSES[1])
      expect(hotSignatory.secret).toEqual({ privateKey: '', publicKey: PUBLIC_KEYS[1] })
    })
    commonTests(rp)
  })
})
