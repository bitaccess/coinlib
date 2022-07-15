import { EthereumBIP44 } from '../src/bip44'
import { ETHEREUM_ADDRESS_REGEX, ETHEREUM_PRVKEY_REGEX, ETHEREUM_PUBKEY_REGEX, EthereumSignatory } from '../src'
import { hdAccount, AccountFixture, DEFAULT_PATH_FIXTURE } from './fixtures/accounts'

function assertExpectedFixture(actual: EthereumSignatory, expected: AccountFixture, index: number, publicOnly: boolean = false) {
  const child = expected.children[index]
  expect(actual.address).toBe(child.address.toLowerCase())
  expect(actual.keys.pub).toBe(child.keys.pub)
  expect(actual.xkeys.xpub).toEqual(expected.xkeys.xpub)
  if (!publicOnly) {
    expect(actual.keys.prv).toBe(child.keys.prv)
    expect(actual.xkeys.xprv).toBe(expected.xkeys.xprv)
  }
}

describe('bip44', () => {
  test ('generateNewKeys', () => {
    const keys = EthereumBIP44.generateNewKeys().getSignatory(0)

    expect(keys.address).toMatch(ETHEREUM_ADDRESS_REGEX)
    expect(keys.xkeys.xpub).toMatch(/^xpub.+$/)
    expect(keys.xkeys.xprv).toMatch(/^xprv.+$/)
    expect(keys.keys.prv).toMatch(ETHEREUM_PRVKEY_REGEX)
    expect(keys.keys.pub).toMatch(ETHEREUM_PUBKEY_REGEX)
  })

  test('should fail to derive from non-extended private key', () => {
    expect(() => {
      EthereumBIP44.fromXKey(DEFAULT_PATH_FIXTURE.children[0].keys.prv).getSignatory(1)
    }).toThrowError(/Not extended key/)
  })

  for (const [derivationPath, accountFixture] of Object.entries(hdAccount.paths)) {
    for (const addressIndexString of Object.keys(accountFixture.children)) {
      const addressIndex = Number.parseInt(addressIndexString)

      test(`derive from root xprv to path ${derivationPath} for index ${addressIndex}`, () => {
        const actual = EthereumBIP44.fromXKey(hdAccount.root.KEYS.xprv, derivationPath)
          .getSignatory(addressIndex)
        assertExpectedFixture(actual, accountFixture, addressIndex)
      })

      test(`derive from account xprv at path ${derivationPath} for index ${addressIndex}`, () => {
        const actual = EthereumBIP44.fromXKey(accountFixture.xkeys.xprv, derivationPath)
          .getSignatory(addressIndex)
        assertExpectedFixture(actual, accountFixture, addressIndex)
      })

      test(`derive from account xpub at path ${derivationPath} for index ${addressIndex}`, () => {
        const actual = EthereumBIP44.fromXKey(accountFixture.xkeys.xpub, derivationPath)
          .getSignatory(addressIndex)
        assertExpectedFixture(actual, accountFixture, addressIndex, true)
      })
    }
  }
})
