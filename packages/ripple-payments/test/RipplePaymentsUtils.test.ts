import { RipplePaymentsUtils } from '../src'
import { hdAccount } from './fixtures/accounts'
import { logger } from './utils'

const { XPRV, XPUB } = hdAccount

const VALID_ADDRESS = 'rJb5KsHsDHF1YS5B5DU6QCkH5NsPaKQTcy'
const REQUIRE_DT_ADDRESS = 'rEb8TK3gBgk5auZkwc6sHnwrGVJH8DuaLh'
const UNACTIVATED_ADDRESS = 'rMHf9wFmAvCQn8XeoHtcb6s2QMxVhxbu57'

const VALID_EXTRA_ID = '123'
const INVALID_EXTRA_ID = 'abc'
const INVALID_ADDRESS = 'abc'

jest.setTimeout(60 * 1000)

describe('RipplePaymentsUtils', () => {
  const rpu = new RipplePaymentsUtils({
    logger,
    server: 'wss://s1.ripple.com',
  })

  beforeAll(async () => {
    await rpu.init()
  }, 120 * 1000)

  afterAll(async () => {
    await rpu.destroy()
  }, 120 * 1000)

  describe('isValidAddress', () => {
    it('returns true for valid address', async () => {
      expect(rpu.isValidAddress(VALID_ADDRESS)).toBe(true)
    })
    it('returns false for invalid address', async () => {
      expect(rpu.isValidAddress('invalid')).toBe(false)
    })
    it('returns false for number', async () => {
      expect(rpu.isValidAddress(123 as any)).toBe(false)
    })
  })

  describe('isValidExtraId', () => {
    it('returns true for valid extraId string', async () => {
      expect(rpu.isValidExtraId('123')).toBe(true)
    })
    it('returns false for invalid extraId string', async () => {
      expect(rpu.isValidExtraId('abc')).toBe(false)
    })
    it('returns false for number', async () => {
      expect(rpu.isValidExtraId(123 as any)).toBe(false)
    })
  })

  describe('isValidPayport', () => {
    it('returns false for empty object', async () => {
      expect(await rpu.isValidPayport({} as any)).toBe(false)
    })
    it('returns true for valid address without extraId', async () => {
      expect(await rpu.isValidPayport({ address: VALID_ADDRESS })).toBe(true)
    })
    it('returns true for valid address with null extraId', async () => {
      expect(await rpu.isValidPayport({ address: VALID_ADDRESS, extraId: null })).toBe(true)
    })
    it('returns true for valid address with undefined extraId', async () => {
      expect(await rpu.isValidPayport({ address: VALID_ADDRESS, extraId: undefined })).toBe(true)
    })
    it('returns true for valid address with valid extraId', async () => {
      expect(await rpu.isValidPayport({ address: VALID_ADDRESS, extraId: VALID_EXTRA_ID })).toBe(true)
    })
    it('returns false for valid address with invalid extraId', async () => {
      expect(await rpu.isValidPayport({ address: VALID_ADDRESS, extraId: INVALID_EXTRA_ID })).toBe(false)
    })
    it('returns false for invalid address with valid extraId', async () => {
      expect(await rpu.isValidPayport({ address: INVALID_ADDRESS, extraId: VALID_EXTRA_ID })).toBe(false)
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
      expect(await rpu.isValidPayport({ address: VALID_ADDRESS, extraId: VALID_EXTRA_ID })).toBe(true)
    })
    it('returns false for valid address without extraId when requireDestinationTag setting enabled', async () => {
      expect(await rpu.isValidPayport({ address: REQUIRE_DT_ADDRESS })).toBe(false)
    })
  })

  describe('getPayportValidationMessage', () => {
    it('returns string for empty object', async () => {
      expect(await rpu.getPayportValidationMessage({} as any)).toMatch('Invalid payport')
    })
    it('returns undefined for valid address with valid extraId', async () => {
      expect(await rpu.getPayportValidationMessage({ address: VALID_ADDRESS, extraId: VALID_EXTRA_ID })).toBe(undefined)
    })
    it('return string for valid address with invalid extraId', async () => {
      expect(await rpu.getPayportValidationMessage({ address: VALID_ADDRESS, extraId: INVALID_EXTRA_ID })).toBe(
        'Invalid payport extraId',
      )
    })
  })

  describe('validatePayport', () => {
    it('rejects for empty object', async () => {
      await expect(rpu.validatePayport({} as any)).rejects.toThrow('Invalid payport')
    })
    it('resolves for valid address without extraId', async () => {
      await rpu.validatePayport({ address: VALID_ADDRESS })
    })
    it('resolves for valid address with null extraId', async () => {
      await rpu.validatePayport({ address: VALID_ADDRESS, extraId: null })
    })
    it('resolves for valid address with undefined extraId', async () => {
      await rpu.validatePayport({ address: VALID_ADDRESS, extraId: undefined })
    })
    it('resolves for valid address with valid extraId', async () => {
      await rpu.validatePayport({ address: VALID_ADDRESS, extraId: VALID_EXTRA_ID })
    })
    it('rejects for valid address with invalid extraId', async () => {
      await expect(rpu.validatePayport({ address: VALID_ADDRESS, extraId: INVALID_EXTRA_ID })).rejects.toThrow(
        'Invalid payport extraId',
      )
    })
    it('rejects for invalid address with valid extraId', async () => {
      await expect(rpu.validatePayport({ address: INVALID_ADDRESS, extraId: VALID_EXTRA_ID } as any)).rejects.toThrow(
        'Invalid payport address',
      )
    })
    it('rejects for valid extraId without address', async () => {
      await expect(rpu.validatePayport({ extraId: VALID_EXTRA_ID } as any)).rejects.toThrow('Invalid payport')
    })
    it('rejects for valid extraId with null address', async () => {
      await expect(rpu.validatePayport({ address: null, extraId: VALID_EXTRA_ID } as any)).rejects.toThrow(
        'Invalid payport',
      )
    })
    it('rejects for undefined extraId with undefined address', async () => {
      await expect(rpu.validatePayport({ address: undefined, extraId: undefined } as any)).rejects.toThrow(
        'Invalid payport',
      )
    })
    it('resolves for valid address with valid extraId', async () => {
      await rpu.validatePayport({ address: VALID_ADDRESS, extraId: VALID_EXTRA_ID })
    })
    it('rejects for valid address without extraId when requireDestinationTag setting enabled', async () => {
      await expect(rpu.validatePayport({ address: REQUIRE_DT_ADDRESS })).rejects.toThrow('Payport extraId is required')
    })
    it('resolves for unactivated address and valid extraId', async () => {
      await rpu.validatePayport({ address: UNACTIVATED_ADDRESS, extraId: VALID_EXTRA_ID })
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

  describe('getCurrentBlockNumber', () => {
    it('returns a nonzero number', async () => {
      expect(await rpu.getCurrentBlockNumber()).toBeGreaterThan(0)
    })
  })
})
