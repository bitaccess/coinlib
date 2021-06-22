import { generateMnemonic, deriveSignatory, mnemonicToSeed } from '../src/bip44'

import { hdAccount } from './fixtures/accounts'
const { MNEMONIC, SEED, ADDRESSES, SECRETS } = hdAccount

describe('bip44', () => {

  test('generateMnemonic', () => {
    expect(generateMnemonic()).toBeTruthy()
  })

  test('deriveSignatory 0 from seed', () => {
    expect(deriveSignatory(SEED, 0)).toEqual({
      address: ADDRESSES[0],
      secret: SECRETS[0],
    })
  })

  test('deriveSignatory 1 from seed', () => {
    expect(deriveSignatory(SEED, 1)).toEqual({
      address: ADDRESSES[1],
      secret: SECRETS[1],
    })
  })

  test('deriveKeyPair 0 from mnemonic', () => {
    expect(deriveSignatory(MNEMONIC, 0)).toEqual({
      address: ADDRESSES[0],
      secret: SECRETS[0],
    })
  })

  test('deriveKeyPair 1 from mnemonic', () => {
    expect(deriveSignatory(MNEMONIC, 1)).toEqual({
      address: ADDRESSES[1],
      secret: SECRETS[1],
    })
  })

  test('mnemonicToSeed', () => {
    expect(mnemonicToSeed(MNEMONIC)).toBe(SEED)
  })
})
