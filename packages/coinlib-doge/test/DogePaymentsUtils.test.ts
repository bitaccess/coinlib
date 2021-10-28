import { DogePaymentsUtils } from '../src'
import { PRIVATE_KEY, ADDRESS_VALID } from './fixtures'
const VALID_ADDRESS = ADDRESS_VALID

describe('DogePaymentUtils', () => {
  let pu: DogePaymentsUtils
  beforeEach(() => {
    pu = new DogePaymentsUtils()
  })

  describe('isValidAddress', () => {
    test('should return true for valid', async () => {
      expect(pu.isValidAddress(VALID_ADDRESS)).toBe(true)
    })
    test('should return false for invalid', async () => {
      expect(pu.isValidAddress('fake')).toBe(false)
    })
  })

  describe('isValidExtraId', () => {
    test('should return false', async () => {
      expect(pu.isValidExtraId('fake')).toBe(false)
    })
  })

  describe('isValidPrivateKey', () => {
    test('should return true for valid', async () => {
      expect(pu.isValidPrivateKey(PRIVATE_KEY)).toBe(true)
    })
    test('should return false for invalid', async () => {
      expect(pu.isValidPrivateKey('fake')).toBe(false)
    })
  })

  describe('getPayportValidationMessage', () => {
    it('returns string for empty object', async () => {
      expect(pu.getPayportValidationMessage({} as any)).toMatch('Invalid payport')
    })
    it('return string for valid address with invalid extraId', async () => {
      expect(pu.getPayportValidationMessage({ address: VALID_ADDRESS, extraId: '' })).toMatch('Invalid payport')
    })
  })
})
