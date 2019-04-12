import { xprvToXpub, deriveAddress, derivePrivateKey } from '#/bip44'
import { hdAccount } from './fixtures/accounts'

const { XPRV, XPUB, PRIVATE_KEYS, ADDRESSES } = hdAccount

describe('bip44', () => {
  test('xprvToXpub', () => {
    expect(xprvToXpub(XPRV)).toBe(XPUB)
  })
  test('deriveAddress', () => {
    expect(deriveAddress(XPUB, 1)).toBe(ADDRESSES[1])
  })
  test('derivePrivateKey', () => {
    expect(derivePrivateKey(XPRV, 1)).toBe(PRIVATE_KEYS[1])
  })
})
