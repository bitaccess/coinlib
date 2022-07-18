import { KeyPairEthereumPayments, KeyPairEthereumPaymentsConfig } from '../src'
import { DEFAULT_PATH_FIXTURE } from './fixtures/accounts'
import { TestLogger } from '../../../common/testUtils'
import { keysOf, NetworkType } from '@bitaccess/coinlib-common'

const GAS_STATION_URL = 'https://gasstation.test.url'
const PARITY_URL = 'https://parity.test.url'
const INFURA_URL = 'https://infura.test.url'

const logger = new TestLogger('HdEthereumPaymentsTest')

const account0 = DEFAULT_PATH_FIXTURE
const child0 = account0.children[0]
const child1 = account0.children[1]

const KEY_PAIRS = [
  child1.keys.pub,
  undefined,
  child0.keys.prv,
  child0.address,
  null,
]

const CONFIG: KeyPairEthereumPaymentsConfig = {
  network: NetworkType.Testnet,
  gasStation: GAS_STATION_URL,
  parityNode: PARITY_URL,
  fullNode: INFURA_URL,
  keyPairs: KEY_PAIRS,
  logger,
}

const EXPECTED_ADDRESSES: KeyPairEthereumPayments['addresses'] = {
  0: child1.address.toLowerCase(),
  2: child0.address.toLowerCase(),
  3: child0.address.toLowerCase(),
}

const EXPECTED_PRIVATE_KEYS: KeyPairEthereumPayments['privateKeys'] = {
  2: child0.keys.prv
}

/** These indices are based on the order provided in keyPairs list */
const EXPECTED_ADDRESS_INDICES: KeyPairEthereumPayments['addressIndices'] = {
  [child1.address.toLowerCase()]: 0,
  [child0.address.toLowerCase()]: 3,
}

// methods from base
describe('KeyPairEthereumPayments', () => {
  describe('constructor', () => {
    test('instanitate with address, extended and normal private keys', () => {
      const { addresses, privateKeys, addressIndices } = new KeyPairEthereumPayments(CONFIG)

      expect(Object.keys(addresses).length).toBe(3)
      expect(Object.keys(privateKeys).length).toBe(1)
      expect(Object.keys(addressIndices).length).toBe(2)

      expect(addresses).toEqual(EXPECTED_ADDRESSES)
      expect(privateKeys).toEqual(EXPECTED_PRIVATE_KEYS)
      expect(addressIndices).toEqual(EXPECTED_ADDRESS_INDICES)
    })
  })

  describe('native methods', () => {
    let kpEP: KeyPairEthereumPayments
    beforeEach(() => {
      kpEP = new KeyPairEthereumPayments(CONFIG)
    })

    describe('getPublicConfig', () => {
      test('returns public part of the provided config data', () => {
        const pubConf = kpEP.getPublicConfig()
        expect(pubConf).toStrictEqual({
          network: NetworkType.Testnet,
          keyPairs: EXPECTED_ADDRESSES,
        })
      })
    })

    describe('getAccountIds', () => {
      test('returns array of addresses', () => {
        expect(kpEP.getAccountIds().sort()).toEqual(Object.keys(EXPECTED_ADDRESS_INDICES).sort())
      })
    })

    describe('can get addresses that are specified', () => {
      for (const i of keysOf(EXPECTED_ADDRESSES)) {
        const expectedAddress = EXPECTED_ADDRESSES[i]

        test(`can getAccountId at ${i}`, () => {
          expect(kpEP.getAccountId(i)).toBe(EXPECTED_ADDRESSES[i])
        })

        test(`can getPayport at ${i}`, async () => {
          expect(await kpEP.getPayport(i)).toStrictEqual({
            address: expectedAddress
          })
        })
      }
    })

    describe('can get private keys that are specified', () => {
      for (const i of keysOf(EXPECTED_PRIVATE_KEYS)) {
        test(`can getPrivateKey at ${i}`, async () => {
          expect(await kpEP.getPrivateKey(i)).toBe(EXPECTED_PRIVATE_KEYS[i])
        })
      }
    })

    describe('cannot get anything for null and undefined keys', () => {
      for (let i = 0; i < KEY_PAIRS.length; i++) {
        if (EXPECTED_ADDRESSES[i]) {
          continue
        }

        test(`cannot getAccountId at ${i}`, () => {
          expect(() => kpEP.getAccountId(i)).toThrowError(`Cannot get account ID at ${i}`)
        })

        test(`cannot getPayport at ${i}`, async () => {
          await expect(kpEP.getPayport(i)).rejects.toThrowError(`Cannot get payport at ${i}`)
        })

        test(`cannot getPrivateKey at ${i}`, async () => {
          await expect(kpEP.getPrivateKey(i)).rejects.toThrowError(`Cannot get private key at ${i}`)
        })
      }
    })
  })

})
