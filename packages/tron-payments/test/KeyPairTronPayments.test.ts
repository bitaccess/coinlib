import KeyPairTronPayments from '#/KeyPairTronPayments'

import { hdAccount } from './fixtures/accounts'

const { PRIVATE_KEYS, ADDRESSES } = hdAccount

function runTests(tp: KeyPairTronPayments) {
  it('getAddress for private keyPair', async () => {
    expect(await tp.getAddress(1)).toBe(ADDRESSES[1])
  })
  it('getAddress for public keyPair', async () => {
    expect(await tp.getAddress(2)).toBe(ADDRESSES[2])
  })
  it('getAddress fails for undefined keyPair', async () => {
    await expect(tp.getAddress(0))
      .rejects.toThrow()
  })
  it('getAddress fails for unknown index', async () => {
    await expect(tp.getAddress(8))
      .rejects.toThrow()
  })
  it('getPrivateKey for private key keyPair', async () => {
    expect(await tp.getPrivateKey(1)).toBe(PRIVATE_KEYS[1])
  })
  it('getPrivateKey fails for address keyPair', async () => {
    await expect(tp.getPrivateKey(2))
      .rejects.toThrow()
  })
  it('getPrivateKey fails for undefined keyPair', async () => {
    await expect(tp.getAddress(0))
      .rejects.toThrow()
  })
  it('getPrivateKey fails for unknown index', async () => {
    await expect(tp.getAddress(8))
      .rejects.toThrow()
  })
}

describe('KeyPairTronPayments', () => {

  describe('array of key pairs', () => {
    const keyPairs = [undefined, PRIVATE_KEYS[1], ADDRESSES[2]]
    const tp = new KeyPairTronPayments({
      keyPairs,
    })
    runTests(tp)
  })

  describe('object of key pairs', () => {
    const keyPairs = {
      1: PRIVATE_KEYS[1],
      2: ADDRESSES[2],
    }
    const tp = new KeyPairTronPayments({
      keyPairs,
    })
    runTests(tp)
  })
})
