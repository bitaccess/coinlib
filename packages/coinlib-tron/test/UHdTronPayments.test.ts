import fs from 'fs'
import path from 'path'
import {  NetworkType } from '@bitaccess/coinlib-common'
import { hdAccount } from './fixtures/accounts'
import {
  UHdTronPayments,
  HdTronPaymentsConfig,
  UHdTronPaymentsConfig,
} from '../src'
import { runHardcodedPublicKeyTests } from './helpers'
import { logger } from './utils'

const { SEED, XPRV, XPUB, PRIVATE_KEYS, ADDRESSES } = hdAccount

const SECRET_XPRV_FILE = 'test/keys/mainnet.key'

const rootDir = path.resolve(__dirname, '..')
const secretXprvFilePath = path.resolve(rootDir, SECRET_XPRV_FILE)
let secretXprv = ''
if (fs.existsSync(secretXprvFilePath)) {
  secretXprv = fs
    .readFileSync(secretXprvFilePath)
    .toString('utf8')
    .trim()
  logger.log(`Loaded ${SECRET_XPRV_FILE}. Send and sweep tests enabled.`)
} else {
  logger.log(
    `File ${SECRET_XPRV_FILE} missing. Send and sweep tests will be skipped. To enable all tests ask Dylan to share the file with you on Lastpass.`,
  )
}


describe('UHdTronPayments', () => {
  let testsComplete = false

  afterAll(() => {
    testsComplete = true
  })

  describe('static', () => {
    it('generateNewKeys should return xprv and xpub', async () => {
      const keys = UHdTronPayments.generateNewKeys()
      expect(keys.xpub).toMatch(/^xpub\w{107}/)
      expect(keys.xprv).toMatch(/^xprv\w{107}/)
    })
    it('should throw on invalid uniPubKey', () => {
      expect(() => new UHdTronPayments({ uniPubKey: 'invalid' })).toThrow()
    })
  })

  describe('hardcoded xpub', () => {
    const config = {
      uniPubKey: XPUB,
      network: NetworkType.Mainnet,
      logger,
    }
    const oldConfig: HdTronPaymentsConfig = {
        hdKey: XPUB,
        network: NetworkType.Mainnet,
        logger, 
    }
    const tp = new UHdTronPayments(config)

    runHardcodedPublicKeyTests(tp, oldConfig)

    it('getPrivateKey throws', async () => {
      await expect(tp.getPrivateKey(1)).rejects.toThrow()
    })
  })

  describe('hardcoded xprv', () => {
    const config: UHdTronPaymentsConfig = {
      seed: SEED,
      network: NetworkType.Mainnet,
      logger,
    }
    const oldConfig: HdTronPaymentsConfig = {
        hdKey: XPRV,
        network: NetworkType.Mainnet,
        logger, 
    }
    const tp = new UHdTronPayments(config)

    runHardcodedPublicKeyTests(tp, oldConfig)

    it('getPrivateKey returns private key 1', async () => {
      expect(await tp.getPrivateKey(1)).toEqual(PRIVATE_KEYS[1])
    })
  })

  if (secretXprv) {
    describe('secret xprv', () => {
      const tp = new UHdTronPayments({
        seed: SEED,
        network: NetworkType.Mainnet,
        logger,
      })
      const address0 = ADDRESSES[0]
      const address3 = ADDRESSES[3]
      const xpub = XPUB

      it('get correct xpub', async () => {
        expect(tp.getXpub()).toEqual(xpub)
      })
      it('get correct address for index 0', async () => {
        expect(await tp.getPayport(0)).toEqual({ address: address0 })
      })
      it('get correct address for index 3', async () => {
        expect(await tp.getPayport(3)).toEqual({ address: address3 })
      })
      it('get correct balance for index 0', async () => {
        expect(await tp.getBalance(0)).toEqual({
          confirmedBalance: '0',
          unconfirmedBalance: '0',
          spendableBalance: '0',
          sweepable: false,
          requiresActivation: false,
          minimumBalance: '0.1',
        })
      })
      it('get correct balance for address 0', async () => {
        expect(await tp.getBalance({ address: address0 })).toEqual({
          confirmedBalance: '0',
          unconfirmedBalance: '0',
          spendableBalance: '0',
          sweepable: false,
          requiresActivation: false,
          minimumBalance: '0.1',
        })
      })

    })
  }
})
