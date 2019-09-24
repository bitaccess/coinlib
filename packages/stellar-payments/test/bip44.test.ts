import { StellarAPI } from 'stellar-sdk'

import { publicKeyToAddress, xprvToXpub, deriveSignatory } from '../src/bip44'
import { hdAccount } from './fixtures/accounts'

const { XPRV, XPUB, PRIVATE_KEYS, PUBLIC_KEYS, ADDRESSES } = hdAccount

describe('bip44', () => {
  test('publicKeyToAddress is correct', () => {
    expect(publicKeyToAddress('ED9434799226374926EDA3B54B1B461B4ABF7237962EAE18528FEA67595397FA32')).toBe(
      'rDTXLQ7ZKZVKz33zJbHjgVShjsBnqMBhmN',
    )
  })

  test('xprvToXpub', () => {
    expect(xprvToXpub(XPRV)).toBe(XPUB)
  })

  test('stellar api address derivation consistent with fixtures', () => {
    expect(new StellarAPI().deriveAddress(PUBLIC_KEYS[0])).toBe(ADDRESSES[0])
  })

  test('deriveKeyPair 0 from xprv', () => {
    expect(deriveSignatory(XPRV, 0)).toEqual({
      address: ADDRESSES[0],
      secret: {
        privateKey: PRIVATE_KEYS[0],
        publicKey: PUBLIC_KEYS[0],
      },
    })
  })

  test('deriveKeyPair 0 from xpub', () => {
    expect(deriveSignatory(XPUB, 0)).toEqual({
      address: ADDRESSES[0],
      secret: {
        privateKey: '',
        publicKey: PUBLIC_KEYS[0],
      },
    })
  })
})
