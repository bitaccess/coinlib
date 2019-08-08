import { setupTestnetPayments } from './utils'
import { AccountRipplePayments } from '../src'
import { ADDRESS_REGEX } from '../src/constants'

describe('AccountRipplePayments', async () => {
  let rp: AccountRipplePayments
  beforeAll(async () => {
    rp = await setupTestnetPayments()
    await rp.setup()
  })
  afterAll(async () => {
    await rp.destroy()
  })

  describe('getPayport', () => {
    it('index 0 should return hot account address', async () => {
      const pp = await rp.getPayport(0)
      expect(pp.address).toMatch(ADDRESS_REGEX)
      expect(pp.extraId).toBe(undefined)
    })
    it('index 1 should return deposit account address', async () => {
      const pp = await rp.getPayport(1)
      expect(pp.address).toMatch(ADDRESS_REGEX)
      expect(pp.extraId).toBe(undefined)
    })
    it('index 2 should return deposit account address plus extraId', async () => {
      const pp = await rp.getPayport(2)
      expect(pp.address).toMatch(ADDRESS_REGEX)
      expect(pp.extraId).toBe('2')
    })
  })

  describe('getBalance', () => {
    it('should have hot account balance', async () => {
      const balances = await rp.getBalance(0)
      expect(Number.parseInt(balances.confirmedBalance)).toBeGreaterThan(20)
      expect(balances.unconfirmedBalance).toBe('0')
      expect(balances.sweepable).toBe(true)
    })
    it('should have deposit account balance', async () => {
      const balances = await rp.getBalance(1)
      expect(Number.parseInt(balances.confirmedBalance)).toBeGreaterThan(20)
      expect(balances.unconfirmedBalance).toBe('0')
      expect(balances.sweepable).toBe(true)
    })
  })
})
