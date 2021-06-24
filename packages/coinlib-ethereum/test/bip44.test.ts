import { deriveSignatory } from '../src/bip44'
import { hdAccount } from './fixtures/accounts'

describe('bip44', () => {
  test ('generateNewKeys', () => {
    const keys = deriveSignatory()

    expect(keys.address)
    expect(keys.xkeys.xpub).toMatch(/^xpub.+$/)
    expect(keys.xkeys.xprv).toMatch(/^xprv.+$/)
    expect(keys.keys.prv)
    expect(keys.keys.pub)
  })

  test('deriveSignatory 0 from root xprv', () => {
    const res = deriveSignatory(hdAccount.root.KEYS.xprv, 0)
    const exp = hdAccount.rootChild[0]

    expect(res.address).toBe(exp.address.toLowerCase())
    exp.address = exp.address.toLowerCase()
    expect(res).toStrictEqual(exp)
  })

  test('deriveSignatory 1 from root xprv', () => {
    const res = deriveSignatory(hdAccount.root.KEYS.xprv, 1)
    const exp = hdAccount.rootChild[1]

    expect(res.address).toBe(exp.address.toLowerCase())
    exp.address = exp.address.toLowerCase()
    expect(res).toStrictEqual(exp)
  })

  test('deriveSignatory 0 from child0 xprv', () => {
    const res = deriveSignatory(hdAccount.rootChild[0].xkeys.xprv, 0)
    const exp = hdAccount.child0Child[0]

    expect(res.address).toBe(exp.address.toLowerCase())
    exp.address = exp.address.toLowerCase()
    expect(res).toStrictEqual(exp)
  })

  test('deriveSignatory 0 from child1 xprv', () => {
    const res = deriveSignatory(hdAccount.rootChild[1].xkeys.xprv, 0)
    const exp = hdAccount.child1Child[0]

    expect(res.address).toBe(exp.address.toLowerCase())
    exp.address = exp.address.toLowerCase()
    expect(res).toStrictEqual(exp)
  })

  test('deriveSignatory 0 from child0 xpub', () => {
    const res = deriveSignatory(hdAccount.rootChild[0].xkeys.xpub, 0)
    const exp = hdAccount.child0ChildPub[0]

    expect(res.address).toBe(exp.address.toLowerCase())
    exp.address = exp.address.toLowerCase()
    expect(res).toStrictEqual(exp)
  })

  test('deriveSignatory 1 from child1 xpub', () => {
    const res = deriveSignatory(hdAccount.rootChild[1].xkeys.xpub, 1)
    const exp = hdAccount.child1ChildPub[1]

    expect(res.address).toBe(exp.address.toLowerCase())
    exp.address = exp.address.toLowerCase()
    expect(res).toStrictEqual(exp)
  })

  test('Trying to derive signatory from private key', () => {
    expect(() => {
      deriveSignatory(hdAccount.rootChild[0].keys.prv, 1)
    }).toThrowError(/Not extended key/)
  })
})
