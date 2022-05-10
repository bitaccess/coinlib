import { FeeLevel, FeeRateType, AutoFeeLevels } from '@bitaccess/coinlib-common'
import { BitcoinPaymentsUtils } from '../src'
import { PRIVATE_KEY, ADDRESS_SEGWIT_P2SH, ADDRESS_BECH32M } from './fixtures'

const VALID_ADDRESS = ADDRESS_SEGWIT_P2SH

describe('BitcoinPaymentUtils', () => {
  let pu: BitcoinPaymentsUtils
  beforeEach(() => {
    pu = new BitcoinPaymentsUtils()
  })

  describe('isValidAddress', () => {
    test('should return true for valid', async () => {
      expect(pu.isValidAddress(VALID_ADDRESS)).toBe(true)
    })
    test('should return true for valid bech32m address', async () => {
      expect(pu.isValidAddress(ADDRESS_BECH32M)).toBe(true)
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

  describe('getCurrentBlockNumber', () => {
    it('returns a nonzero number', async () => {
      expect(await pu.getCurrentBlockNumber()).toBeGreaterThan(0)
    })
  })

  describe('getBlock', () => {
    it(
      'can retrieve latest',
      async () => {
        const block = await pu.getBlock()
        expect(block.id).toBeTruthy()
        expect(block.height).toBeGreaterThan(0)
        expect(block.previousId).toBeTruthy()
        expect(block.time).toBeTruthy()
        expect(Date.now() - block.time.getTime()).toBeLessThan(120 * 60 * 1000) // latest was within past 2 hrs
        expect(block.raw).toBeDefined()
      },
      10 * 1000,
    )
    it(
      'can retrieve 666666',
      async () => {
        const block = await pu.getBlock(666666)
        expect(block.id).toBe('0000000000000000000b7b8574bc6fd285825ec2dbcbeca149121fc05b0c828c')
        expect(block.height).toBe(666666)
        expect(block.previousId).toBe('0000000000000000000d3ac711558b41b477e4d2c178aa816f267ee9e82c71a3')
        expect(block.time).toEqual(new Date(1611012483000))
        expect(block.raw).toBeDefined()
      },
      10 * 1000,
    )
  })

  describe('getFeeRateRecommendation', () => {
    const levels: AutoFeeLevels[] = [FeeLevel.High, FeeLevel.Medium, FeeLevel.Low]
    for (const level of levels) {
      for (const source of [undefined, 'blockbook', 'blockcypher']) {
        it(`can retrieve ${level} fee level recommendation with ${source} source`, async () => {
          const { feeRate, feeRateType } = await pu.getFeeRateRecommendation(level, { source })
          expect(Number.parseFloat(feeRate)).toBeGreaterThan(0)
          expect(feeRateType).toBe(FeeRateType.BasePerWeight)
        })
      }
    }
  })
})
