import { KeyPairEthereumPayments } from '../src/KeyPairEthereumPayments'
import { hdAccount } from './fixtures/accounts'
import { TestLogger } from '../../../common/testUtils'
import { deriveSignatory } from '../src/bip44'
import { NetworkType } from '@faast/payments-common'

const GAS_STATION_URL = 'https://gasstation.test.url'
const PARITY_URL = 'https://parity.test.url'
const INFURA_URL = 'https://infura.test.url'

const logger = new TestLogger('HdEthereumPaymentsTest')

const CONFIG = {
  network: NetworkType.Testnet,
  gasStation: GAS_STATION_URL,
  parityNode: PARITY_URL,
  fullNode: INFURA_URL,
  keyPairs: [ hdAccount.rootChild[0].xkeys.xprv, hdAccount.rootChild[0].keys.prv, hdAccount.rootChild[0].address, undefined, null ],
  logger,
}
const DERIVED_SIGNATORY = deriveSignatory(hdAccount.rootChild[0].xkeys.xprv)

// methods from base
describe('KeyPairEthereumPayments', () => {
  describe('constructor', () => {
    test('instanitate with address, extended and normal private keys', () => {
      const { addresses, privateKeys, addressIndices } = new KeyPairEthereumPayments(CONFIG)

      expect(Object.keys(addresses).length).toBe(1)
      expect(Object.keys(privateKeys).length).toBe(1)
      expect(Object.keys(addressIndices).length).toBe(1)

      expect(addresses[0]).toBe(hdAccount.rootChild[0].address.toLowerCase())
      expect(privateKeys[0]).toBe(hdAccount.rootChild[0].keys.prv)
      expect(addressIndices[hdAccount.rootChild[0].address.toLowerCase()]).toBe(0)
    })
  })

  describe('native methods', () => {
    let kpEP: any
    beforeEach(() => {
      kpEP = new KeyPairEthereumPayments(CONFIG)
    })

    describe('getPublicConfig', () => {
      test('returns public part of the provided config data', () => {
        const pubConf = kpEP.getPublicConfig()
        expect(pubConf).toStrictEqual({
          network: NetworkType.Testnet,
          gasStation: CONFIG.gasStation,
          parityNode: CONFIG.parityNode,
          keyPairs: {
            '0': hdAccount.rootChild[0].address.toLowerCase()
          }
        })
      })
    })

    describe('getAccountId', () => {
      test('returns address by index', () => {
        expect(kpEP.getAccountId(0)).toBe(hdAccount.rootChild[0].address.toLowerCase())
      })
    })

    describe('getAccountIds', () => {
      test('returns array of addresses', () => {
        expect(kpEP.getAccountIds()).toStrictEqual([hdAccount.rootChild[0].address.toLowerCase()])
      })
    })

    describe('getPayport', () => {
      test('returns object address by provided index', async () => {
        expect(await kpEP.getPayport(0)).toStrictEqual({
          address: hdAccount.rootChild[0].address.toLowerCase()
        })
      })
    })

    describe('getPrivateKey', () => {
      test('returns prv', async () => {
        expect(await kpEP.getPrivateKey(0)).toBe(hdAccount.rootChild[0].keys.prv)
      })
    })
  })
})
