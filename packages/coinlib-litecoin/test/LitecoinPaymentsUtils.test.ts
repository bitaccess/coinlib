import { LitecoinPaymentsUtils, LitecoinAddressFormat, hexSeedToBuffer, AddressType } from '../src'
import {
  PRIVATE_KEY,
  ADDRESS_LEGACY,
  ADDRESS_SEGWIT_P2SH,
  ADDRESS_SEGWIT_P2SH_DEPRECATED,
  ADDRESS_SEGWIT_NATIVE,
} from './fixtures'
import { logger } from './utils'
import { NetworkType } from '@bitaccess/coinlib-common'


const VALID_ADDRESS = ADDRESS_SEGWIT_P2SH

describe('LitecoinPaymentsUtils', () => {
  const pu = new LitecoinPaymentsUtils({ logger })

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

  describe('validAddressFormat = undefined', () => {
    describe('isValidAddress', () => {
      it('should return true for legacy address', async () => {
        expect(pu.isValidAddress(ADDRESS_LEGACY)).toBe(true)
      })
      it('should return true for modern p2sh segwit address', async () => {
        expect(pu.isValidAddress(ADDRESS_SEGWIT_P2SH)).toBe(true)
      })
      it('should return true for deprecated p2sh segwit address', async () => {
        expect(pu.isValidAddress(ADDRESS_SEGWIT_P2SH_DEPRECATED)).toBe(true)
      })
      it('should return true for native segwit address', async () => {
        expect(pu.isValidAddress(ADDRESS_SEGWIT_NATIVE)).toBe(true)
      })
      it('should return false for invalid', async () => {
        expect(pu.isValidAddress('fake')).toBe(false)
      })
    })

    describe('standardizeAddress', () => {
      it('should return same address for legacy address', async () => {
        expect(pu.standardizeAddress(ADDRESS_LEGACY)).toBe(ADDRESS_LEGACY)
      })
      it('should return same address for modern p2sh segwit address', async () => {
        expect(pu.standardizeAddress(ADDRESS_SEGWIT_P2SH)).toBe(ADDRESS_SEGWIT_P2SH)
      })
      it('should return modern p2sh address for deprecated p2sh segwit address', async () => {
        expect(pu.standardizeAddress(ADDRESS_SEGWIT_P2SH_DEPRECATED)).toBe(ADDRESS_SEGWIT_P2SH)
      })
      it('should return same address for native segwit address', async () => {
        expect(pu.standardizeAddress(ADDRESS_SEGWIT_NATIVE)).toBe(ADDRESS_SEGWIT_NATIVE)
      })
      it('should return null for invalid address', async () => {
        expect(pu.standardizeAddress('fake')).toBe(null)
      })
    })
  })

  describe('validAddressFormat = deprecated', () => {
    const puDeprecated = new LitecoinPaymentsUtils({ logger, validAddressFormat: LitecoinAddressFormat.Deprecated })

    describe('isValidAddress', () => {
      it('should return true for legacy address', async () => {
        expect(puDeprecated.isValidAddress(ADDRESS_LEGACY)).toBe(true)
      })
      it('should return false for modern p2sh segwit address', async () => {
        expect(puDeprecated.isValidAddress(ADDRESS_SEGWIT_P2SH)).toBe(false)
      })
      it('should return true for deprecated p2sh segwit address', async () => {
        expect(puDeprecated.isValidAddress(ADDRESS_SEGWIT_P2SH_DEPRECATED)).toBe(true)
      })
      it('should return true for native segwit address', async () => {
        expect(puDeprecated.isValidAddress(ADDRESS_SEGWIT_NATIVE)).toBe(true)
      })
      it('should return false for invalid', async () => {
        expect(puDeprecated.isValidAddress('fake')).toBe(false)
      })
    })

    describe('standardizeAddress', () => {
      it('should return same address for legacy address', async () => {
        expect(puDeprecated.standardizeAddress(ADDRESS_LEGACY)).toBe(ADDRESS_LEGACY)
      })
      it('should return deprecated p2sh address for modern p2sh segwit address', async () => {
        expect(puDeprecated.standardizeAddress(ADDRESS_SEGWIT_P2SH)).toBe(ADDRESS_SEGWIT_P2SH_DEPRECATED)
      })
      it('should return same address for deprecated p2sh segwit address', async () => {
        expect(puDeprecated.standardizeAddress(ADDRESS_SEGWIT_P2SH_DEPRECATED)).toBe(ADDRESS_SEGWIT_P2SH_DEPRECATED)
      })
      it('should return same address for native segwit address', async () => {
        expect(puDeprecated.standardizeAddress(ADDRESS_SEGWIT_NATIVE)).toBe(ADDRESS_SEGWIT_NATIVE)
      })
      it('should return null for invalid address', async () => {
        expect(puDeprecated.standardizeAddress('fake')).toBe(null)
      })
    })
  })

  describe('determinePathForIndex', () => {
    const puMainnet = new LitecoinPaymentsUtils({ network: NetworkType.Mainnet })
    const puTestnet = new LitecoinPaymentsUtils({ network: NetworkType.Testnet })
    test('Mainnet SegwitNative', () => {
      const options = {addressType: AddressType.SegwitNative}
      const path = puMainnet.determinePathForIndex(3, options)
      expect(path).toBe(`m/84'/2'/3'`)
    })
    test('Mainnet MultisigSegwitNative', () => {
      const options = {addressType: AddressType.MultisigSegwitNative}
      const path = puMainnet.determinePathForIndex(3, options)
      expect(path).toBe(`m/87'/2'/3'`)
    })
    test('Testnet SegwitP2SH', () => {
      const options = {addressType: AddressType.SegwitP2SH}
      const path = puTestnet.determinePathForIndex(4, options)
      expect(path).toBe(`m/49'/2'/4'`)
    })
    test('Testnet MultisigLegacy', () => {
      const options = {addressType: AddressType.MultisigLegacy}
      const path = puTestnet.determinePathForIndex(4, options)
      expect(path).toBe(`m/87'/2'/4'`)
    })
  })

  describe('deriveUniPubKeyForPath', () => {
    const puMainnet = new LitecoinPaymentsUtils({ network: NetworkType.Mainnet })
    const puTestnet = new LitecoinPaymentsUtils({ network: NetworkType.Testnet })
    const seedHex =
      '716bbb2c373406156d6fc471db0c62d957e27d97f1d07bfb0b2d22f04d07b75b32f2542e20f077251d7bc390cac8847ac6e64d94bccff1e1b2cd82802df35a78'
    const seedBuffer = hexSeedToBuffer(seedHex)

    test('Mainnet Legacy', () => {
      const xpub = puMainnet.deriveUniPubKeyForPath(seedBuffer, `m/44'/2'/3'`)
      const expectedXpub =
        'xpub6Bkka9B54EKtfMgePsUmhd8Cxg3Y83YNi1eXenA9MiPhBhEuduyixDUtuk3HBohprXrNdG5w3K75gNoKGFTQ7Qg1uEkSVgzmmJXgk6qBQ1o'
      expect(xpub).toBe(expectedXpub)
    })

    test('Mainnet SegwitNative', () => {
      const xpub = puMainnet.deriveUniPubKeyForPath(seedBuffer, `m/84'/2'/3'`)
      const expectedXpub =
        'xpub6BvLNPJKAmW96yMudAToxApnE6gYKvpwAjoRqB68T4ePcAUVyHBM2XDuPyg13WovZRabBUxdCmPFw3j86TibRp2t39mfymCpFok87zDV3gm'
      expect(xpub).toBe(expectedXpub)
    })
    test('Mainnet should support arbitrary path', () => {
      const xpub = puMainnet.deriveUniPubKeyForPath(seedBuffer, `m/84'/1'/2'/3'`)
      const expectedXpub =
        'xpub6EqnY4VGxRMdCuZaXLVFoz5DwV71NiYqA6QAtzhfodSxLvGjktxVQR1hfDStPsBi4foFXnNsSJXWQ2HkJbT7bSESVUDzagz22Wnef57oiT6'
      expect(xpub).toBe(expectedXpub)
    })

    test('Testnet MultisigLegacy', () => {
      const xpub = puTestnet.deriveUniPubKeyForPath(seedBuffer, `m/87'/1'/4'`)
      const expectedXpub =
        'tpubDCHyWQfXp2aefcHocJn7CvtRJ1mmqbm2x8D1v3HJ8QF9cDoBK25327B42W5HtyvEmfVZB3f3zVHWwQp4BcWKosQSuugqCDZH7KFvmtbtSwz'
      expect(xpub).toBe(expectedXpub)
    })
  })
})
