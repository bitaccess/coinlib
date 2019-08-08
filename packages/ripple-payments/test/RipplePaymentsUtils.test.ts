import { RipplePaymentsUtils } from '../src'
import { hdAccount } from './fixtures/accounts'

const { XPRV, XPUB, PRIVATE_KEYS, PUBLIC_KEYS, ADDRESSES } = hdAccount

const VALID_EXTRA_ID = '123'
const INVALID_EXTRA_ID = 'abc'

describe('RipplePaymentsUtils', () => {
  const rpu = new RipplePaymentsUtils()

  describe('isValidAddress', () => {
    it('returns true for valid address', async () => {
      expect(await rpu.isValidAddress(ADDRESSES[0])).toBe(true)
    })
    it('returns false for invalid address', async () => {
      expect(await rpu.isValidAddress('invalid')).toBe(false)
    })
    it('returns false for number', async () => {
      expect(await rpu.isValidAddress(123 as any)).toBe(false)
    })
  })

  describe('isValidExtraId', () => {
    it('returns true for valid extraId string', async () => {
      expect(await rpu.isValidExtraId('123')).toBe(true)
    })
    it('returns false for invalid extraId string', async () => {
      expect(await rpu.isValidExtraId('abc')).toBe(false)
    })
    it('returns false for number', async () => {
      expect(await rpu.isValidExtraId(123 as any)).toBe(false)
    })
  })

  describe('isValidPayport', () => {
    it('returns false for empty object', async () => {
      expect(await rpu.isValidPayport({} as any)).toBe(false)
    })
    it('returns true for valid address without extraId', async () => {
      expect(await rpu.isValidPayport({ address: ADDRESSES[0] })).toBe(true)
    })
    it('returns true for valid address with null extraId', async () => {
      expect(await rpu.isValidPayport({ address: ADDRESSES[0], extraId: null })).toBe(true)
    })
    it('returns true for valid address with undefined extraId', async () => {
      expect(await rpu.isValidPayport({ address: ADDRESSES[0], extraId: undefined })).toBe(true)
    })
    it('returns true for valid address with valid extraId', async () => {
      expect(await rpu.isValidPayport({ address: ADDRESSES[0], extraId: VALID_EXTRA_ID })).toBe(true)
    })
    it('returns false for valid address with invalid extraId', async () => {
      expect(await rpu.isValidPayport({ address: ADDRESSES[0], extraId: INVALID_EXTRA_ID })).toBe(false)
    })
    it('returns false for valid extraId without address', async () => {
      expect(await rpu.isValidPayport({ extraId: VALID_EXTRA_ID } as any)).toBe(false)
    })
    it('returns false for valid extraId with null address', async () => {
      expect(await rpu.isValidPayport({ address: null, extraId: VALID_EXTRA_ID } as any)).toBe(false)
    })
    it('returns false for valid extraId with undefined extraId', async () => {
      expect(await rpu.isValidPayport({ address: undefined, extraId: undefined } as any)).toBe(false)
    })
    it('returns true for valid extraId with valid address', async () => {
      expect(await rpu.isValidPayport({ address: ADDRESSES[0], extraId: VALID_EXTRA_ID })).toBe(true)
    })
  })

  describe('toMainDenomination', () => {
    it('converts from string', () => {
      expect(rpu.toMainDenomination('123456789')).toBe('123.456789')
    })
    it('converts from number', () => {
      expect(rpu.toMainDenomination(123456789)).toBe('123.456789')
    })
  })

  describe('toBaseDenomination', () => {
    it('converts from string', () => {
      expect(rpu.toBaseDenomination('123.456789')).toBe('123456789')
    })
    it('converts from number', () => {
      expect(rpu.toBaseDenomination(123.456789)).toBe('123456789')
    })
  })

  describe('isValidXpub', () => {
    it('should return true for valid', () => {
      expect(rpu.isValidXpub(XPUB)).toBe(true)
    })
    it('should return true for valid', () => {
      expect(rpu.isValidXpub('xpat1234')).toBe(false)
    })
  })

  describe('isValidXprv', () => {
    it('should return true for valid', () => {
      expect(rpu.isValidXprv(XPRV)).toBe(true)
    })
    it('should return false for invalid', () => {
      expect(rpu.isValidXprv('xpat1234')).toBe(false)
    })
  })
})
