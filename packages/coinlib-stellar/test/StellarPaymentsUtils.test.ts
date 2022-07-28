import { StellarPaymentsUtils } from '../src'
import { hdAccount } from './fixtures/accounts'
import { NetworkType } from '@bitaccess/coinlib-common'
import { hexSeedToBuffer } from '../src/helpers'
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
    server: 'https://horizon.stellar.org',
  })

  beforeAll(async () => {
    await pu.init()
  }, 120 * 1000)

  afterAll(async () => {
    await pu.destroy()
  }, 120 * 1000)

  describe('isValidAddress', () => {
    it('returns true for valid address', async () => {
      expect(pu.isValidAddress(VALID_ADDRESS)).toBe(true)
    })
    it('returns false for invalid address', async () => {
      expect(pu.isValidAddress('invalid')).toBe(false)
    })
    it('returns false for number', async () => {
      expect(pu.isValidAddress(123 as any)).toBe(false)
    })
  })

  describe('isValidExtraId', () => {
    it('returns true for valid extraId string', async () => {
      expect(pu.isValidExtraId('123')).toBe(true)
    })
    it('returns false for number', async () => {
      expect(pu.isValidExtraId(123 as any)).toBe(false)
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

  describe('getPayportValidationMessage', () => {
    it('returns string for empty object', async () => {
      expect(await pu.getPayportValidationMessage({} as any)).toMatch('Invalid payport')
    })
    it('returns undefined for valid address with valid extraId', async () => {
      expect(await pu.getPayportValidationMessage({ address: VALID_ADDRESS, extraId: VALID_EXTRA_ID })).toBe(undefined)
    })
    it('return string for valid address with invalid extraId', async () => {
      expect(await pu.getPayportValidationMessage({ address: VALID_ADDRESS, extraId: INVALID_EXTRA_ID })).toMatch(
        'Invalid payport',
      )
    })
  })

  describe('validatePayport', () => {
    it('rejects for empty object', async () => {
      await expect(pu.validatePayport({} as any)).rejects.toThrow('Invalid payport')
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
        'Invalid payport - Expected type string | null | undefined for Payport.extraId',
      )
    })
    it('rejects for invalid address with valid extraId', async () => {
      await expect(pu.validatePayport({ address: INVALID_ADDRESS, extraId: VALID_EXTRA_ID } as any)).rejects.toThrow(
        'Invalid payport address',
      )
    })
    it('rejects for valid extraId without address', async () => {
      await expect(pu.validatePayport({ extraId: VALID_EXTRA_ID } as any)).rejects.toThrow('Invalid payport')
    })
    it('rejects for valid extraId with null address', async () => {
      await expect(pu.validatePayport({ address: null, extraId: VALID_EXTRA_ID } as any)).rejects.toThrow(
        'Invalid payport',
      )
    })
    it('rejects for undefined extraId with undefined address', async () => {
      await expect(pu.validatePayport({ address: undefined, extraId: undefined } as any)).rejects.toThrow(
        'Invalid payport',
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

  describe('getCurrentBlockNumber', () => {
    it('returns a nonzero number', async () => {
      expect(await pu.getCurrentBlockNumber()).toBeGreaterThan(0)
    })
  })

  describe('determinePathForIndex', () => {
    const puMainnet = new StellarPaymentsUtils({ network: NetworkType.Mainnet })
    const puTestnet = new StellarPaymentsUtils({ network: NetworkType.Testnet })
    test('Mainnet Legancy', () => {
      const path = puMainnet.determinePathForIndex(3)
      expect(path).toBe(`m/44'/148'/3'`)
    })
    test('Testnet Legancy', () => {
      const path = puTestnet.determinePathForIndex(4, 'p2pkh')
      expect(path).toBe(`m/44'/148'/4'`)
    })
  })

  describe('deriveUniPubKeyForPath', () => {
    const puMainnet = new StellarPaymentsUtils({ network: NetworkType.Mainnet })
    const seedHex =
      '716bbb2c373406156d6fc471db0c62d957e27d97f1d07bfb0b2d22f04d07b75b32f2542e20f077251d7bc390cac8847ac6e64d94bccff1e1b2cd82802df35a78'
    const seedBuffer = hexSeedToBuffer(seedHex)

    test('Mainnet Legacy', () => {
      const xpub = puMainnet.deriveUniPubKeyForPath(seedBuffer, `m/44'/148'/3'`)
      const expectedXpub =
        'GCD55BW4BF5IMI3JUNOJ7XYWOIJCIHXQB2AQF3IUEL3H4YJA67HWSW57:GDQCD2QYSWYWPYTQDQE6JPG5GSC6NTU4SO6E2YC25C4I66TUBVAWF6HV'
      expect(xpub).toBe(expectedXpub)
    })

    test('Mainnet should support arbitrary path', () => {
      const xpub = puMainnet.deriveUniPubKeyForPath(seedBuffer, `m/84'/148'/3'`)
      const expectedXpub =
        'GCQJKW6MU4SSSSBK7PGQSTMEAQPMKPF72VHSCGGG254AFXWAVP7JX6WW:GAMAH4ZTNGBDGZ3NGS5MSARXC3YD4RF6QJJFX2NNCSLBGWBPW4PM77B3'
      expect(xpub).toBe(expectedXpub)
    })

    test('Testnet Legacy', () => {
      const xpub = puMainnet.deriveUniPubKeyForPath(seedBuffer, `m/44'/1'/4'`)
      const expectedXpub =
        'GCZ4443P3ZZVJIMYVE7QD6XKUIBCV33VSIVS3OM3DHRJXTKUXGD5YQZV:GBNVCHSHEF6OBRFXWPMCKHUITLSPUGWOUHZXLX3WMMLT4KYGVZG3UB4R'
      expect(xpub).toBe(expectedXpub)
    })
  })

})
