import { TronAddressValidator } from '../src/TronAddressValidator'
import { hdAccount } from './fixtures/accounts'

const { ADDRESSES } = hdAccount

describe('TronAddressValidator', () => {
  let tav: TronAddressValidator
  beforeEach(() => {
    tav = new TronAddressValidator()
  })

  test('validate should return true for valid', async () => {
    expect(tav.validate(ADDRESSES[0])).toBe(true)
  })
  test('validate should return true for valid', async () => {
    expect(tav.validate('fake')).toBe(false)
  })
})
