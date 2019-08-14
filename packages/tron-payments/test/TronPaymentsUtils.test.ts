import { TronPaymentsUtils } from '../src'
import { hdAccount } from './fixtures/accounts'

const { ADDRESSES, PRIVATE_KEYS } = hdAccount

describe('TronAddressValidator', () => {
  let tpu: TronPaymentsUtils
  beforeEach(() => {
    tpu = new TronPaymentsUtils()
  })

  describe('isValidAddress', () => {
    test('should return true for valid', async () => {
      expect(await tpu.isValidAddress(ADDRESSES[0])).toBe(true)
    })
    test('should return false for invalid', async () => {
      expect(await tpu.isValidAddress('fake')).toBe(false)
    })
  })

  describe('isValidExtraId', () => {
    test('should return false', async () => {
      expect(await tpu.isValidExtraId('fake')).toBe(false)
    })
  })

  describe('isValidPrivateKey', () => {
    test('should return true for valid', async () => {
      expect(tpu.isValidPrivateKey(PRIVATE_KEYS[0])).toBe(true)
    })
    test('should return false for invalid', async () => {
      expect(tpu.isValidPrivateKey('fake')).toBe(false)
    })
  })
})
