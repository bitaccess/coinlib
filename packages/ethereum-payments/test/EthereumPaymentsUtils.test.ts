import { EthereumPaymentsUtils } from '../src/EthereumPaymentsUtils'
import { hdAccount } from './fixtures/accounts'

import { TestLogger } from '../../../common/testUtils'
const logger = new TestLogger('EthereumPaymentUtilssTest')

const INVALID_ADDRESS = 'totally invalid'
const VALID_ADDRESS = hdAccount.rootChild[0].address
const VALID_PRVKEY = hdAccount.rootChild[0].keys.prv
const VALID_XPRVKEY = hdAccount.rootChild[0].xkeys.xprv
const VALID_XPUBKEY = hdAccount.rootChild[0].xkeys.xpub

describe('EthereumPaymentsUtils', () => {
  let epu: EthereumPaymentsUtils
  beforeEach(() => {
    epu = new EthereumPaymentsUtils({ logger })
  })

  describe('toBaseDenomination', () => {
    test('denominates eth in wei', () => {
      expect(epu.toBaseDenomination('1')).toBe('1000000000000000000')
      expect(epu.toBaseDenomination(1)).toBe('1000000000000000000')
      expect(epu.toBaseDenomination('1.00000000000000000005')).toBe('1000000000000000000')
    })
  })

  describe('toMainDenomination', () => {
    test('denominates wei in eth', () => {
      expect(epu.toMainDenomination('1')).toBe('0.000000000000000001')
      expect(epu.toMainDenomination(1)).toBe('0.000000000000000001')
    })
  })

  describe('isValidAddress', () => {
    test('should return true for valid', async () => {
      expect(await epu.isValidAddress(VALID_ADDRESS)).toBe(true)
    })

    test('should return false for invalid', async () => {
      expect(await epu.isValidAddress('fake')).toBe(false)
    })
  })

  describe('isValidExtraId', () => {
    test('should always return false', async () => {
      expect(await epu.isValidExtraId('fake')).toBe(false)
    })
  })

  describe('isValidPayport', () => {
    test('returns false for empty object', async () => {
      expect(await epu.isValidPayport({} as any)).toBe(false)
    })

    test('returns true for valid address', async () => {
      expect(await epu.isValidPayport({ address: VALID_ADDRESS })).toBe(true)
    })

    test('returns false for invalid address', async () => {
      expect(await epu.isValidPayport({ address: INVALID_ADDRESS })).toBe(false)
    })

    test('returns false for null address', async () => {
      expect(await epu.isValidPayport({ address: null } as any)).toBe(false)
    })

    test('returns false for undefined address', async () => {
      expect(await epu.isValidPayport({ address: undefined } as any)).toBe(false)
    })
  })

  describe('validatePayport', () => {
    test('resolves for valid address', async () => {
      await epu.validatePayport({ address: VALID_ADDRESS })
    })

    test('rejects for empty object', async () => {
      let err: string = ''
      try {
        await epu.validatePayport({} as any)
      } catch (e) {
        err = e.message
      }
      expect(err).toBe('Invalid payport address')
    })

    test('rejects for invalid address', async () => {
      let err: string = ''
      try {
        await epu.validatePayport({ address: INVALID_ADDRESS } as any)
      } catch (e) {
        err = e.message
      }
      expect(err).toBe('Invalid payport address')
    })

    test('rejects for null address', async () => {
      let err: string = ''
      try {
        await epu.validatePayport({ address: null } as any)
      } catch (e) {
        err = e.message
      }
      expect(err).toBe('Invalid payport address')
    })

    test('rejects for undefined address', async () => {
      let err: string = ''
      try {
        await epu.validatePayport({ address: undefined } as any)
      } catch (e) {
        err = e.message
      }
      expect(err).toBe('Invalid payport address')
    })
  })

  describe('getPayportValidationMessage', () => {
    test('returns string for empty object', async () => {
      expect(await epu.getPayportValidationMessage({} as any)).toMatch('Invalid payport')
    })

    test('return string for valid address with invalid extraId', async () => {
      expect(await epu.getPayportValidationMessage({ address: VALID_ADDRESS })).toBe(undefined)
    })
  })

  // non interface methods
  describe('isValidXprv', () => {
    test('returns true for valid extended private key', () => {
      expect(epu.isValidXprv(VALID_XPRVKEY)).toBe(true)
    })

    test('returns false for invalid extended private key', () => {
      expect(epu.isValidXprv('invalid')).toBe(false)
    })

    test('returns false for valid extended public key', () => {
      expect(epu.isValidXprv(VALID_XPUBKEY)).toBe(false)
    })
  })

  describe('isValidXpub', () => {
    test('returns true for valid extended public key', () => {
      expect(epu.isValidXpub(VALID_XPUBKEY)).toBe(true)
    })

    test('returns false for invalid extended public key', () => {
      expect(epu.isValidXpub('invalid')).toBe(false)
    })

    test('returns false for valid extended private key', () => {
      expect(epu.isValidXpub(VALID_XPRVKEY)).toBe(false)
    })
  })

  describe('isValidPrivateKey', () => {
    test('should return true for valid', async () => {
      expect(epu.isValidPrivateKey(VALID_PRVKEY)).toBe(true)
    })

    test('should return false for invalid', async () => {
      expect(epu.isValidPrivateKey('fake')).toBe(false)
    })
  })

  describe('privateKeyToAddress', () => {
    test('converts address for given private key', async () => {
      expect(epu.privateKeyToAddress(VALID_PRVKEY)).toBe(VALID_ADDRESS.toLowerCase())
    })
  })
})
