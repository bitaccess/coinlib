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
    const root0Child = deriveSignatory(hdAccount.root.KEYS.xprv, 0)
    expect(root0Child).toStrictEqual(hdAccount.rootChild[0])
  })

  test('deriveSignatory 1 from root xprv', () => {
    expect(deriveSignatory(hdAccount.root.KEYS.xprv, 1)).toStrictEqual(hdAccount.rootChild[1])
  })

  test('deriveSignatory 0 from child0 xprv', () => {
    expect(deriveSignatory(hdAccount.rootChild[0].xkeys.xprv, 0)).toStrictEqual(hdAccount.child0Child[0])
  })

  test('deriveSignatory 0 from child1 xprv', () => {
    expect(deriveSignatory(hdAccount.rootChild[1].xkeys.xprv, 0)).toStrictEqual(hdAccount.child1Child[0])
  })

  test('deriveSignatory 0 from child0 xpub', () => {
    expect(deriveSignatory(hdAccount.rootChild[0].xkeys.xpub, 0)).toStrictEqual(hdAccount.child0ChildPub[0])
  })

  test('deriveSignatory 1 from child1 xpub', () => {
    expect(deriveSignatory(hdAccount.rootChild[1].xkeys.xpub, 1)).toStrictEqual(hdAccount.child1ChildPub[1])
  })

  test('Trying to derive signatory from private key', () => {
    expect(() => {
      deriveSignatory(hdAccount.rootChild[0].keys.prv, 1)
    }).toThrowError(/Not extended key/)
  })
})
