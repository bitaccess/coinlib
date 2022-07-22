import Web3 from 'web3'
import { EthereumPaymentsUtils } from '../src/EthereumPaymentsUtils'
import { DEFAULT_PATH_FIXTURE, hdAccount } from './fixtures/accounts'

import { TestLogger } from '../../../common/testUtils'
import { EthereumAddressFormat } from '../src/types'
const web3 = new Web3()
const logger = new TestLogger(__filename)

const INVALID_ADDRESS = 'totally invalid'
const VALID_ADDRESS = DEFAULT_PATH_FIXTURE.children[0].address
const VALID_PRVKEY = DEFAULT_PATH_FIXTURE.children[0].keys.prv
const VALID_XPRVKEY = DEFAULT_PATH_FIXTURE.xkeys.xprv
const VALID_XPUBKEY = DEFAULT_PATH_FIXTURE.xkeys.xpub

const VALID_ADDRESS_CHECKSUM = web3.utils.toChecksumAddress(VALID_ADDRESS)
const VALID_ADDRESS_LOWERCASE = VALID_ADDRESS.toLowerCase()

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

  describe('units conversion for no base denomination', () => {
    test('conversion', () => {
      const ep = new EthereumPaymentsUtils({ logger, decimals: 0 })

      expect(ep.toBaseDenomination('7')).toBe('7')
      expect(ep.toMainDenomination('5')).toBe('5')
    })
  })

  describe('isValidAddress', () => {
    describe('unspecified format', () => {
      test('should return true for valid checksum address', async () => {
        expect(epu.isValidAddress(VALID_ADDRESS_CHECKSUM)).toBe(true)
      })

      test('should return true for valid lowercase address', async () => {
        expect(epu.isValidAddress(VALID_ADDRESS_LOWERCASE)).toBe(true)
      })

      test('should return false for invalid address', async () => {
        expect(epu.isValidAddress(INVALID_ADDRESS)).toBe(false)
      })
    })
    describe('lowercase format', () => {
      const options = { format: EthereumAddressFormat.Lowercase }
      test('should return false for valid checksum address', async () => {
        expect(epu.isValidAddress(VALID_ADDRESS_CHECKSUM, options)).toBe(false)
      })

      test('should return true for valid lowercase address', async () => {
        expect(epu.isValidAddress(VALID_ADDRESS_LOWERCASE, options)).toBe(true)
      })

      test('should return false for invalid address', async () => {
        expect(epu.isValidAddress(INVALID_ADDRESS, options)).toBe(false)
      })
    })
    describe('checksum format', () => {
      const options = { format: EthereumAddressFormat.Checksum }
      test('should return true for valid checksum address', async () => {
        expect(epu.isValidAddress(VALID_ADDRESS_CHECKSUM, options)).toBe(true)
      })

      test('should return false for valid lowercase address', async () => {
        expect(epu.isValidAddress(VALID_ADDRESS_LOWERCASE, options)).toBe(false)
      })

      test('should return false for invalid address', async () => {
        expect(epu.isValidAddress(INVALID_ADDRESS, options)).toBe(false)
      })
    })
  })

  describe('standardizeAddress', () => {
    describe('unspecified format', () => {
      test('should return lowercase address for valid checksum address', async () => {
        expect(epu.standardizeAddress(VALID_ADDRESS_CHECKSUM)).toBe(VALID_ADDRESS_LOWERCASE)
      })
      test('should return same address for valid lowercase address', async () => {
        expect(epu.standardizeAddress(VALID_ADDRESS_LOWERCASE)).toBe(VALID_ADDRESS_LOWERCASE)
      })
      test('should return null for invalid address', async () => {
        expect(epu.standardizeAddress(INVALID_ADDRESS)).toBe(null)
      })
    })
    describe('lowercase format', () => {
      const options = { format: EthereumAddressFormat.Lowercase }
      test('should return lowercase address for valid checksum address', async () => {
        expect(epu.standardizeAddress(VALID_ADDRESS_CHECKSUM, options)).toBe(VALID_ADDRESS_LOWERCASE)
      })
      test('should return same address for valid lowercase address', async () => {
        expect(epu.standardizeAddress(VALID_ADDRESS_LOWERCASE, options)).toBe(VALID_ADDRESS_LOWERCASE)
      })
      test('should return null for invalid address', async () => {
        expect(epu.standardizeAddress(INVALID_ADDRESS, options)).toBe(null)
      })
    })
    describe('checksum format', () => {
      const options = { format: EthereumAddressFormat.Checksum }
      test('should return same address for valid checksum address', async () => {
        expect(epu.standardizeAddress(VALID_ADDRESS_CHECKSUM, options)).toBe(VALID_ADDRESS_CHECKSUM)
      })
      test('should return checksum address for valid lowercase address', async () => {
        expect(epu.standardizeAddress(VALID_ADDRESS_LOWERCASE, options)).toBe(VALID_ADDRESS_CHECKSUM)
      })
      test('should return null for invalid address', async () => {
        expect(epu.standardizeAddress(INVALID_ADDRESS, options)).toBe(null)
      })
    })
  })

  describe('isValidExtraId', () => {
    test('should always return false', async () => {
      expect(epu.isValidExtraId('')).toBe(false)
    })
  })

  describe('isValidPayport', () => {
    test('returns false for empty object', async () => {
      expect(epu.isValidPayport({} as any)).toBe(false)
    })

    test('returns true for valid address', async () => {
      expect(epu.isValidPayport({ address: VALID_ADDRESS })).toBe(true)
    })

    test('returns false for invalid address', async () => {
      expect(epu.isValidPayport({ address: INVALID_ADDRESS })).toBe(false)
    })

    test('returns false for null address', async () => {
      expect(epu.isValidPayport({ address: null } as any)).toBe(false)
    })

    test('returns false for undefined address', async () => {
      expect(epu.isValidPayport({ address: undefined } as any)).toBe(false)
    })
  })

  describe('validatePayport', () => {
    test('resolves for valid address', async () => {
      epu.validatePayport({ address: VALID_ADDRESS })
    })

    test('rejects for empty object', async () => {
      let err: string = ''
      try {
        epu.validatePayport({} as any)
      } catch (e) {
        err = e.message
      }
      expect(err).toBe('Invalid Ethereum payport address')
    })

    test('rejects for invalid address', async () => {
      let err: string = ''
      try {
        epu.validatePayport({ address: INVALID_ADDRESS } as any)
      } catch (e) {
        err = e.message
      }
      expect(err).toBe('Invalid Ethereum payport address')
    })

    test('rejects for null address', async () => {
      let err: string = ''
      try {
        epu.validatePayport({ address: null } as any)
      } catch (e) {
        err = e.message
      }
      expect(err).toBe('Invalid Ethereum payport address')
    })

    test('rejects for undefined address', async () => {
      let err: string = ''
      try {
        epu.validatePayport({ address: undefined } as any)
      } catch (e) {
        err = e.message
      }
      expect(err).toBe('Invalid Ethereum payport address')
    })
  })

  describe('getPayportValidationMessage', () => {
    test('returns string for empty object', async () => {
      expect(epu.getPayportValidationMessage({} as any)).toMatch('Invalid payport')
    })

    test('return string for valid address with invalid extraId', async () => {
      expect(epu.getPayportValidationMessage({ address: VALID_ADDRESS })).toBe(undefined)
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
