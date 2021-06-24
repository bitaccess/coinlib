import { KeyPairTronPaymentsConfig, KeyPairTronPayments } from '../src'

import { hdAccount } from './fixtures/accounts'

const EXTERNAL_ADDRESS = 'TW22XzVixyFZU5DxQJwxqXuKfNKFNMLqJ2'

const { PRIVATE_KEYS, ADDRESSES } = hdAccount

function runTests(tp: KeyPairTronPayments, config: KeyPairTronPaymentsConfig) {
  it('getFullConfig', () => {
    expect(tp.getFullConfig()).toEqual(config)
  })
  it('getPublicConfig', () => {
    expect(tp.getPublicConfig()).toEqual({
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
    expect(tp.getAccountId(1)).toEqual(ADDRESSES[1])
  })
  it('getAccountId for public keyPair', () => {
    expect(tp.getAccountId(2)).toEqual(ADDRESSES[2])
  })
  it('getAccountId fails for undefined keyPair', () => {
    expect(() => tp.getAccountId(0)).toThrow()
  })
  it('getPayport for private keyPair', async () => {
    expect(await tp.getPayport(1)).toEqual({ address: ADDRESSES[1] })
  })
  it('getPayport for public keyPair', async () => {
    expect(await tp.getPayport(2)).toEqual({ address: ADDRESSES[2] })
  })
  it('getPayport fails for undefined keyPair', async () => {
    await expect(tp.getPayport(0)).rejects.toThrow()
  })
  it('getPayport fails for unknown index', async () => {
    await expect(tp.getPayport(8)).rejects.toThrow()
  })
  it('getPrivateKey for private key keyPair', async () => {
    expect(await tp.getPrivateKey(1)).toEqual(PRIVATE_KEYS[1])
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
