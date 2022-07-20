import { EthereumBIP44 } from '../src/bip44'
import { ETHEREUM_ADDRESS_REGEX, ETHEREUM_PRVKEY_REGEX, ETHEREUM_PUBKEY_REGEX, EthereumSignatory } from '../src'
import { hdAccount, AccountFixture, DEFAULT_PATH_FIXTURE } from './fixtures/accounts'
import { bip39 } from '@bitaccess/coinlib-common'
import crypto from 'crypto'

function assertExpectedFixture(actual: EthereumSignatory, expected: AccountFixture, index: number, publicOnly: boolean = false) {
  const child = expected.children[index]
  expect(actual.address).toBe(child.address.toLowerCase())
  expect(actual.keys.pub).toBe(child.keys.pub)
  expect(actual.xkeys.xpub).toEqual(expected.xkeys.xpub)
  if (!publicOnly) {
    expect(actual.keys.prv).toBe(child.keys.prv)
    expect(actual.xkeys.xprv).toBe(expected.xkeys.xprv)
  } else {
    expect(actual.keys.prv).toBe('')
    expect(actual.xkeys.xprv).toBe('')
  }
}

function assertSignatoryGeneric(keys: EthereumSignatory) {
  expect(keys.address).toMatch(ETHEREUM_ADDRESS_REGEX)
  expect(keys.xkeys.xpub).toMatch(/^xpub.+$/)
  expect(keys.xkeys.xprv).toMatch(/^xprv.+$/)
  expect(keys.keys.prv).toMatch(ETHEREUM_PRVKEY_REGEX)
  expect(keys.keys.pub).toMatch(ETHEREUM_PUBKEY_REGEX)
}

describe('bip44', () => {
  test ('generateNewKeys', () => {
    const keys = EthereumBIP44.generateNewKeys()
    assertSignatoryGeneric(keys.getSignatory(0))
  })

  describe('fromSeed', () => {
    test('using mnemonic', () => {
      const keys = EthereumBIP44.fromSeed(bip39.generateMnemonic())
      assertSignatoryGeneric(keys.getSignatory(0))
    })
    test('using seed buffer', () => {
      const keys = EthereumBIP44.fromSeed(crypto.randomBytes(64))
      assertSignatoryGeneric(keys.getSignatory(0))
    })
  })

  test('should fail to derive from non-extended private key', () => {
    expect(() => {
      EthereumBIP44.fromXKey(DEFAULT_PATH_FIXTURE.children[0].keys.prv).getSignatory(1)
    }).toThrowError(/Invalid/)
  })

  for (const [pathKey, accountFixture] of Object.entries(hdAccount.paths)) {
    describe(`derivation path ${pathKey}`, () => {

      // Object.entries converts undefined key to "undefined" string
      const derivationPath = pathKey === 'undefined' ? undefined : pathKey

      for (const addressIndexString of Object.keys(accountFixture.children)) {
        const addressIndex = Number.parseInt(addressIndexString)

        describe(`address index ${addressIndex}`, () => {

          it(`can derive using root xprv`, () => {
            const actual = EthereumBIP44.fromXKey(hdAccount.root.KEYS.xprv, derivationPath)
              .getSignatory(addressIndex)
            assertExpectedFixture(actual, accountFixture, addressIndex)
          })

          it(`can derive using account xprv`, () => {
            const actual = EthereumBIP44.fromXKey(accountFixture.xkeys.xprv, derivationPath)
              .getSignatory(addressIndex)
            assertExpectedFixture(actual, accountFixture, addressIndex)
          })

          it(`can derive using account xpub`, () => {
            const actual = EthereumBIP44.fromXKey(accountFixture.xkeys.xpub, derivationPath)
              .getSignatory(addressIndex)
            assertExpectedFixture(actual, accountFixture, addressIndex, true)
          })
        })
      }
    })
  }
})
