import KeyPairTronPayments from '#/KeyPairTronPayments'

import { hdAccount } from './fixtures/accounts'
import { KeyPairTronPaymentsConfig } from '../src/types'

const EXTERNAL_ADDRESS = 'TW22XzVixyFZU5DxQJwxqXuKfNKFNMLqJ2'

const { PRIVATE_KEYS, ADDRESSES } = hdAccount

function runTests(tp: KeyPairTronPayments, config: KeyPairTronPaymentsConfig) {
  it('getFullConfig', () => {
    expect(tp.getFullConfig()).toBe(config)
  })
  it('getPublicConfig', () => {
    expect(tp.getPublicConfig()).toEqual({
      ...config,
      keyPairs: {
        1: ADDRESSES[1],
        2: ADDRESSES[2],
      },
    })
  })
  it('getAccountIds', () => {
    expect(new Set(tp.getAccountIds())).toEqual(new Set([ADDRESSES[1], ADDRESSES[2]]))
  })
  it('getAccountId for private keyPair', () => {
    expect(tp.getAccountId(1)).toBe(ADDRESSES[1])
  })
  it('getAccountId for public keyPair', () => {
    expect(tp.getAccountId(2)).toBe(ADDRESSES[2])
  })
  it('getAccountId fails for undefined keyPair', () => {
    expect(() => tp.getAccountId(0)).toThrow()
  })
  it('getAddress for private keyPair', async () => {
    expect(await tp.getAddress(1)).toBe(ADDRESSES[1])
  })
  it('getAddress for public keyPair', async () => {
    expect(await tp.getAddress(2)).toBe(ADDRESSES[2])
  })
  it('getAddress fails for undefined keyPair', async () => {
    await expect(tp.getAddress(0)).rejects.toThrow()
  })
  it('getAddress fails for unknown index', async () => {
    await expect(tp.getAddress(8)).rejects.toThrow()
  })
  it('getAddressIndex for private keyPair', async () => {
    expect(await tp.getAddressIndex(ADDRESSES[1])).toBe(1)
  })
  it('getAddressIndex for public keyPair', async () => {
    expect(await tp.getAddressIndex(ADDRESSES[2])).toBe(2)
  })
  it('getAddressIndex fails for external address', async () => {
    await expect(tp.getAddressIndex(EXTERNAL_ADDRESS)).rejects.toThrow()
  })
  it('getPrivateKey for private key keyPair', async () => {
    expect(await tp.getPrivateKey(1)).toBe(PRIVATE_KEYS[1])
  })
  it('getPrivateKey fails for address keyPair', async () => {
    await expect(tp.getPrivateKey(2)).rejects.toThrow()
  })
  it('getPrivateKey fails for undefined keyPair', async () => {
    await expect(tp.getPrivateKey(0)).rejects.toThrow()
  })
  it('getPrivateKey fails for unknown index', async () => {
    await expect(tp.getPrivateKey(8)).rejects.toThrow()
  })
}

describe('KeyPairTronPayments', () => {
  describe('static', () => {
    it('should throw on constructor given invalid keyPair', () => {
      expect(() => new KeyPairTronPayments({ keyPairs: ['invalid'] }))
    })
  })

  describe('array of key pairs', () => {
    const keyPairs = [undefined, PRIVATE_KEYS[1], ADDRESSES[2]]
    const config = {
      keyPairs,
    }
    const tp = new KeyPairTronPayments(config)
    runTests(tp, config)
  })

  describe('object of key pairs', () => {
    const keyPairs = {
      1: PRIVATE_KEYS[1],
      2: ADDRESSES[2],
    }
    const config = {
      keyPairs,
    }
    const tp = new KeyPairTronPayments(config)
    runTests(tp, config)
  })
})
