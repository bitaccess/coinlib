import { xprvToXpub, deriveAddress, derivePrivateKey } from '../src'
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

  // This test takes a long time. It really just makes sure we don't have padding
  // issues in a brute force way.
  it.skip('generate 1000 addresses and private keys, make sure they match', async () => {
    const tasks = []
    for (let i = 4000; i < 5000; i++) {
      const address = deriveAddress(XPUB, i)
      const privateKey = derivePrivateKey(XPRV, i)
      const addressFromPkey = xprvToXpub(privateKey)
      if (address !== addressFromPkey) {
        throw new Error(`key mismatch: ${address}, ${privateKey}, ${addressFromPkey}`)
      }
    }
  })
})
