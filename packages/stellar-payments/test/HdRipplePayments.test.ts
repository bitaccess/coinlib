import { HdStellarPayments } from '../src'
import { hdAccount } from './fixtures/accounts'
import { XPUB_REGEX, XPRV_REGEX } from '../src/constants'

const { XPRV, XPUB, PRIVATE_KEYS, PUBLIC_KEYS, ADDRESSES } = hdAccount

function commonTests(rp: HdStellarPayments) {
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

describe('HdStellarPayments', () => {
  describe('static', () => {
    it('generateNewKeys should return xprv and xpub', async () => {
      let keys = HdStellarPayments.generateNewKeys()
      expect(keys.xpub).toMatch(XPUB_REGEX)
      expect(keys.xprv).toMatch(XPRV_REGEX)
    })
    it('should throw on invalid hdKey', () => {
      expect(() => new HdStellarPayments({ hdKey: 'invalid' })).toThrow()
    })
    it('should instantiate with valid xprv', () => {
      const rp = new HdStellarPayments({ hdKey: XPRV })
      expect(rp).toBeInstanceOf(HdStellarPayments)
    })
    it('should instantiate with valid xpub', () => {
      const rp = new HdStellarPayments({ hdKey: XPUB })
      expect(rp).toBeInstanceOf(HdStellarPayments)
    })
  })
  describe('xprv', () => {
    let rp = new HdStellarPayments({ hdKey: XPRV })
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
    let rp = new HdStellarPayments({ hdKey: XPUB })
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
