import { StellarPaymentsUtils } from '../src'
import { hdAccount } from './fixtures/accounts'
import { logger } from './utils'

const { ADDRESSES } = hdAccount

const VALID_ADDRESS = ADDRESSES[0]
const UNACTIVATED_ADDRESS = ADDRESSES[1]

const VALID_EXTRA_ID = '123'
const INVALID_EXTRA_ID = 123 as any
const INVALID_ADDRESS = 'abc'

jest.setTimeout(60 * 1000)

describe('StellarPaymentsUtils', () => {
  const pu = new StellarPaymentsUtils({
    logger,
    server: 'https://horizon.stellar.com',
  })

  beforeAll(async () => {
    await pu.init()
  }, 120 * 1000)

  afterAll(async () => {
    await pu.destroy()
  }, 120 * 1000)

  describe('isValidAddress', () => {
    it('returns true for valid address', async () => {
      expect(await pu.isValidAddress(VALID_ADDRESS)).toBe(true)
    })
    it('returns false for invalid address', async () => {
      expect(await pu.isValidAddress('invalid')).toBe(false)
    })
    it('returns false for number', async () => {
      expect(await pu.isValidAddress(123 as any)).toBe(false)
    })
  })

  describe('isValidExtraId', () => {
    it('returns true for valid extraId string', async () => {
      expect(await pu.isValidExtraId('123')).toBe(true)
    })
    it('returns false for number', async () => {
      expect(await pu.isValidExtraId(123 as any)).toBe(false)
    })
  })

  describe('isValidPayport', () => {
    it('returns false for empty object', async () => {
      expect(await pu.isValidPayport({} as any)).toBe(false)
    })
    it('returns true for valid address without extraId', async () => {
      expect(await pu.isValidPayport({ address: VALID_ADDRESS })).toBe(true)
    })
    it('returns true for valid address with null extraId', async () => {
      expect(await pu.isValidPayport({ address: VALID_ADDRESS, extraId: null })).toBe(true)
    })
    it('returns true for valid address with undefined extraId', async () => {
      expect(await pu.isValidPayport({ address: VALID_ADDRESS, extraId: undefined })).toBe(true)
    })
    it('returns true for valid address with valid extraId', async () => {
      expect(await pu.isValidPayport({ address: VALID_ADDRESS, extraId: VALID_EXTRA_ID })).toBe(true)
    })
    it('returns false for valid address with invalid extraId', async () => {
      expect(await pu.isValidPayport({ address: VALID_ADDRESS, extraId: INVALID_EXTRA_ID })).toBe(false)
    })
    it('returns false for invalid address with valid extraId', async () => {
      expect(await pu.isValidPayport({ address: INVALID_ADDRESS, extraId: VALID_EXTRA_ID })).toBe(false)
    })
    it('returns false for valid extraId without address', async () => {
      expect(await pu.isValidPayport({ extraId: VALID_EXTRA_ID } as any)).toBe(false)
    })
    it('returns false for valid extraId with null address', async () => {
      expect(await pu.isValidPayport({ address: null, extraId: VALID_EXTRA_ID } as any)).toBe(false)
    })
    it('returns false for valid extraId with undefined extraId', async () => {
      expect(await pu.isValidPayport({ address: undefined, extraId: undefined } as any)).toBe(false)
    })
    it('returns true for valid extraId with valid address', async () => {
      expect(await pu.isValidPayport({ address: VALID_ADDRESS, extraId: VALID_EXTRA_ID })).toBe(true)
    })
  })

  describe('validatePayport', () => {
    it('rejects for empty object', async () => {
      await expect(pu.validatePayport({} as any)).rejects.toThrow('Invalid type')
    })
    it('resolves for valid address without extraId', async () => {
      await pu.validatePayport({ address: VALID_ADDRESS })
    })
    it('resolves for valid address with null extraId', async () => {
      await pu.validatePayport({ address: VALID_ADDRESS, extraId: null })
    })
    it('resolves for valid address with undefined extraId', async () => {
      await pu.validatePayport({ address: VALID_ADDRESS, extraId: undefined })
    })
    it('resolves for valid address with valid extraId', async () => {
      await pu.validatePayport({ address: VALID_ADDRESS, extraId: VALID_EXTRA_ID })
    })
    it('rejects for valid address with invalid extraId', async () => {
      await expect(pu.validatePayport({ address: VALID_ADDRESS, extraId: INVALID_EXTRA_ID })).rejects.toThrow(
        'Invalid type - Expected type string for Payport.extraId',
      )
    })
    it('rejects for invalid address with valid extraId', async () => {
      await expect(pu.validatePayport({ address: INVALID_ADDRESS, extraId: VALID_EXTRA_ID } as any)).rejects.toThrow(
        'Invalid payport address',
      )
    })
    it('rejects for valid extraId without address', async () => {
      await expect(pu.validatePayport({ extraId: VALID_EXTRA_ID } as any)).rejects.toThrow('Invalid type')
    })
    it('rejects for valid extraId with null address', async () => {
      await expect(pu.validatePayport({ address: null, extraId: VALID_EXTRA_ID } as any)).rejects.toThrow(
        'Invalid type',
      )
    })
    it('rejects for undefined extraId with undefined address', async () => {
      await expect(pu.validatePayport({ address: undefined, extraId: undefined } as any)).rejects.toThrow(
        'Invalid type',
      )
    })
    it('resolves for valid address with valid extraId', async () => {
      await pu.validatePayport({ address: VALID_ADDRESS, extraId: VALID_EXTRA_ID })
    })
    it('resolves for unactivated address and valid extraId', async () => {
      await pu.validatePayport({ address: UNACTIVATED_ADDRESS, extraId: VALID_EXTRA_ID })
    })
  })

  describe('toMainDenomination', () => {
    it('converts from string', () => {
      expect(pu.toMainDenomination('123456789')).toBe('12.3456789')
    })
    it('converts from number', () => {
      expect(pu.toMainDenomination(123456789)).toBe('12.3456789')
    })
  })

  describe('toBaseDenomination', () => {
    it('converts from string', () => {
      expect(pu.toBaseDenomination('12.3456789')).toBe('123456789')
    })
    it('converts from number', () => {
      expect(pu.toBaseDenomination(12.3456789)).toBe('123456789')
    })
  })

})
