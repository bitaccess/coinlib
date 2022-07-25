import { DogePaymentsUtils, hexSeedToBuffer } from '../src'
import { PRIVATE_KEY, ADDRESS_VALID } from './fixtures'
import { NetworkType } from '@bitaccess/coinlib-common'
import { AddressType } from '@bitaccess/coinlib-bitcoin'

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

  describe('determinePathForIndex', () => {
    const puMainnet = new DogePaymentsUtils({ network: NetworkType.Mainnet })
    const puTestnet = new DogePaymentsUtils({ network: NetworkType.Testnet })
    test('Mainnet SegwitNative', () => {
      const options = {addressType: AddressType.Legacy}
      const path = puMainnet.determinePathForIndex(3, options)
      expect(path).toBe(`m/44'/3'/3'`)
    })
    test('Mainnet MultisigSegwitNative', () => {
      const options = {addressType: AddressType.MultisigLegacy}
      const path = puMainnet.determinePathForIndex(3, options)
      expect(path).toBe(`m/87'/3'/3'`)
    })
    test('Testnet SegwitP2SH throw not support err', () => {
      const options = {addressType: AddressType.SegwitP2SH}
      const functionToTrow = ()=> {
        puTestnet.determinePathForIndex(4, options)
      }
      expect(functionToTrow).toThrow(`Dogecoin does not support this type ${options.addressType}`)
    })
    test('Testnet MultisigLegacy', () => {
      const options = {addressType: AddressType.MultisigLegacy}
      const path = puTestnet.determinePathForIndex(4, options)
      expect(path).toBe(`m/87'/3'/4'`)
    })
  })

  describe('deriveUniPubKeyForPath', () => {
    const puMainnet = new DogePaymentsUtils({ network: NetworkType.Mainnet })
    const puTestnet = new DogePaymentsUtils({ network: NetworkType.Testnet })
    const seedHex =
      '716bbb2c373406156d6fc471db0c62d957e27d97f1d07bfb0b2d22f04d07b75b32f2542e20f077251d7bc390cac8847ac6e64d94bccff1e1b2cd82802df35a78'
    const seedBuffer = hexSeedToBuffer(seedHex)

    test('Mainnet Legacy', () => {
      const xpub = puMainnet.deriveUniPubKeyForPath(seedBuffer, `m/44'/3'/3'`)
      const expectedXpub =
        'xpub6CyvqFApx4Exsx3An1AsgVUwLMU55w8VDpZLrThABbGUhuxLzs2mexbbHENjmV1uNzpne8oMpsr2LPXpmNhFcMnXtSNiW6xWaBTvjJXudHf'
      expect(xpub).toBe(expectedXpub)
    })

    test('Mainnet should support aribitrary path', () => {
      const xpub = puMainnet.deriveUniPubKeyForPath(seedBuffer, `m/84'/3'/3'/6'`)
      const expectedXpub =
        'xpub6E3WHmaQz5x3iRWkqeCt3SqQK9K9Yuxonumy19uEXtsC5xG9doTZCNgjJhsFDtpVBi7XDkBuHPb9W8hkReTP2Y5uTTcfNfYVUUk21gsDLXX'
      expect(xpub).toBe(expectedXpub)
    })

    test('Testnet MultisigLegacy', () => {
      const xpub = puTestnet.deriveUniPubKeyForPath(seedBuffer, `m/87'/3'/4'`)
      const expectedXpub =
        'tpubDDmm5f64Bt5Ybuy6MNn5FynYAhyu7pKBuXx1rbekWmF6smv78FE9qSQwvh6a27DcoV9CJ7A9kssKvK8z1TU7jkbMDgV2Qr2MBn7DsKwgGTQ'
      expect(xpub).toBe(expectedXpub)
    })
  })
})
