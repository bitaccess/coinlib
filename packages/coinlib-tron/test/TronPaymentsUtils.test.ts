import { TronPaymentsUtils, hexSeedToBuffer } from '../src'
import { hdAccount } from './fixtures/accounts'
import { NetworkType } from '@bitaccess/coinlib-common'


const { ADDRESSES, PRIVATE_KEYS } = hdAccount

const VALID_ADDRESS = ADDRESSES[0]

describe('TronAddressValidator', () => {
  let tpu: TronPaymentsUtils
  beforeEach(() => {
    tpu = new TronPaymentsUtils()
  })

  describe('isValidAddress', () => {
    test('should return true for valid', async () => {
      expect(tpu.isValidAddress(ADDRESSES[0])).toBe(true)
    })
    test('should return false for invalid', async () => {
      expect(tpu.isValidAddress('fake')).toBe(false)
    })
  })

  describe('isValidExtraId', () => {
    test('should return false', async () => {
      expect(tpu.isValidExtraId('fake')).toBe(false)
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

  describe('getPayportValidationMessage', () => {
    it('returns string for empty object', async () => {
      expect(tpu.getPayportValidationMessage({} as any)).toMatch('Invalid payport')
    })
    it('return string for valid address with invalid extraId', async () => {
      expect(tpu.getPayportValidationMessage({ address: VALID_ADDRESS, extraId: '' })).toMatch('Invalid payport')
    })
  })

  describe('getCurrentBlockNumber', () => {
    it('returns a nonzero number', async () => {
      expect(await tpu.getCurrentBlockNumber()).toBeGreaterThan(0)
    })
  })

  describe('determinePathForIndex', () => {
    const puMainnet = new TronPaymentsUtils({ network: NetworkType.Mainnet })
    const puTestnet = new TronPaymentsUtils({ network: NetworkType.Testnet })
    test('Mainnet Legancy', () => {
      const path = puMainnet.determinePathForIndex(3)
      expect(path).toBe(`m/44'/195'/3'`)
    })
    test('Testnet SegwitP2SH throw not support err', () => {
      const functionToTrow = () => {
        puTestnet.determinePathForIndex(4, "p2sh-p2wpkh")
      }
      expect(functionToTrow).toThrow(`Tron does not support this type p2sh-p2wpkh`)
    })
    test('Testnet Legancy', () => {
      const path = puTestnet.determinePathForIndex(4, 'p2pkh')
      expect(path).toBe(`m/44'/1'/4'`)
    })
  })

  describe('deriveUniPubKeyForPath', () => {
    const puMainnet = new TronPaymentsUtils({ network: NetworkType.Mainnet })
    const seedHex =
      '716bbb2c373406156d6fc471db0c62d957e27d97f1d07bfb0b2d22f04d07b75b32f2542e20f077251d7bc390cac8847ac6e64d94bccff1e1b2cd82802df35a78'
    const seedBuffer = hexSeedToBuffer(seedHex)

    test('Mainnet Legacy', () => {
      const xpub = puMainnet.deriveUniPubKeyForPath(seedBuffer, `m/44'/195'/3'`)
      const expectedXpub =
        'xpub6CMBeDB4dPCaQ6wnYPXzEusSxgwhQ25W6ysTJ6awotriQHXA6SwqmcanD9cjh5PoDukvk1aUYRfWmSz51DWpe5ty3ULJGUfX6PWJSVT69Fb'
      expect(xpub).toBe(expectedXpub)
    })

    test('Mainnet SegwitNative throw not supported error', () => {
      const functionToTrow = () => {
        puMainnet.deriveUniPubKeyForPath(seedBuffer, `m/84'/195'/3'`)
      }
      expect(functionToTrow).toThrow(`Purpose in derivationPath 84' not supported by Tron`)
    })

    test('Testnet Legacy', () => {
      const xpub = puMainnet.deriveUniPubKeyForPath(seedBuffer, `m/44'/1'/4'`)
      const expectedXpub =
        'xpub6CMXU1WLEnhaGJjcbpzFQaYWik6mhqKsvSAALcLQto2BCo9bd6vfpWzs2AHqvaXJ8ZKhUuArz46vZR5SAeSbJT5hdLxhivQQBqbpkFNkTu5'
      expect(xpub).toBe(expectedXpub)
    })
  })


})
