import fs from 'fs'
import path from 'path'
import { NetworkType } from '@bitaccess/coinlib-common'
import { UHdDogePayments, UHdDogePaymentsConfig, HdDogePaymentsConfig, SinglesigAddressType } from '../src'

import {
  EXTERNAL_ADDRESS,
  seedAccountsByAddressType,
  SeedAccountFixture,
  seedLegacyAccount,
  seedLegacyAccountXPrv,
} from './fixtures'
import { logger } from './utils'

jest.setTimeout(30 * 1000)

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
    `File ${SECRET_XPRV_FILE} missing. Send and sweep e2e mainnet tests will be skipped. To enable them ask Dylan to share the file with you.`,
  )
}

describe('UHdDogePayments', () => {
  describe('static', () => {
    it('should throw on invalid uniPubKey', () => {
      expect(() => new UHdDogePayments({ uniPubKey: 'invalid' })).toThrow()
    })
  })

  for (const k in seedAccountsByAddressType) {
    const addressType = k as SinglesigAddressType
    const accountFixture = seedLegacyAccount

    describe(addressType, () => {
      describe('hardcoded xpub', () => {
        const config: UHdDogePaymentsConfig = {
          uniPubKey: accountFixture.uniPubKey,
          network: NetworkType.Mainnet,
          addressType,
          logger,
        }
        const oldConfig: HdDogePaymentsConfig = {
          hdKey: accountFixture.uniPubKey,
          network: NetworkType.Mainnet,
          addressType,
          logger,
        }
        const payments = new UHdDogePayments(config)
        runHardcodedPublicKeyTests(payments, oldConfig, accountFixture)
      })

      describe('hardcoded xprv', () => {
        const config: UHdDogePaymentsConfig = {
          seed: accountFixture.seed,
          uniPubKey: accountFixture.uniPubKey,
          network: NetworkType.Mainnet,
          addressType,
          logger,
        }
        const oldConfig: HdDogePaymentsConfig = {
          hdKey: seedLegacyAccountXPrv,
          network: NetworkType.Mainnet,
          addressType,
          logger,
        }
        const payments = new UHdDogePayments(config)
        runHardcodedPublicKeyTests(payments, oldConfig, accountFixture)
      })
    })
  }
})

function runHardcodedPublicKeyTests(
  payments: UHdDogePayments,
  config: HdDogePaymentsConfig,
  accountFixture: SeedAccountFixture,
) {
  const { seed, uniPubKey, addresses, derivationPath } = accountFixture
  it('getFullConfig', () => {
    const fullConfigResult = payments.getFullConfig()
    expect(fullConfigResult).toEqual({
      hdKey: config.hdKey,
      network: config.network,
      derivationPath,
      addressType: config.addressType,
      logger,
    })
  })
  it('getPublicConfig', () => {
    expect(payments.getPublicConfig()).toEqual({
      hdKey: uniPubKey,
      network: config.network,
      derivationPath,
      addressType: config.addressType,
    })
  })
  it('getAccountIds', () => {
    expect(payments.getAccountIds()).toEqual([uniPubKey])
  })
  it('getAccountId for index 0', () => {
    expect(payments.getAccountId(0)).toEqual(uniPubKey)
  })
  it('getAccountId for index 10', () => {
    expect(payments.getAccountId(10)).toEqual(uniPubKey)
  })
  it('getXpub', async () => {
    expect(payments.xpub).toEqual(uniPubKey)
  })
  for (const iString of Object.keys(accountFixture.addresses)) {
    const i = Number.parseInt(iString)
    it(`getPayport for index ${i}`, async () => {
      const actual = await payments.getPayport(i)
      expect(actual).toEqual({ address: addresses[i] })
    })
  }
  it('resolvePayport resolves for index 1', async () => {
    expect(await payments.resolvePayport(1)).toEqual({ address: addresses[1] })
  })
  it('resolvePayport resolves for address', async () => {
    expect(await payments.resolvePayport(addresses[1])).toEqual({ address: addresses[1] })
  })
  it('resolvePayport resolves for external address', async () => {
    expect(await payments.resolvePayport(EXTERNAL_ADDRESS)).toEqual({ address: EXTERNAL_ADDRESS })
  })
  it('resolvePayport resolves for payport', async () => {
    const payport = { address: addresses[1] }
    expect(await payments.resolvePayport(payport)).toEqual(payport)
  })
  it('resolvePayport throws for invalid address', async () => {
    await expect(payments.resolvePayport('invalid')).rejects.toThrow()
  })
  it('resolveFromTo is correct for (index, index)', async () => {
    expect(await payments.resolveFromTo(0, 2)).toEqual({
      fromAddress: addresses[0],
      fromIndex: 0,
      fromExtraId: undefined,
      fromPayport: { address: addresses[0] },
      toAddress: addresses[2],
      toIndex: 2,
      toExtraId: undefined,
      toPayport: { address: addresses[2] },
    })
  })
  it('resolveFromTo is correct for external address', async () => {
    expect(await payments.resolveFromTo(0, EXTERNAL_ADDRESS)).toEqual({
      fromAddress: addresses[0],
      fromIndex: 0,
      fromExtraId: undefined,
      fromPayport: { address: addresses[0] },
      toAddress: EXTERNAL_ADDRESS,
      toIndex: null,
      toExtraId: undefined,
      toPayport: { address: EXTERNAL_ADDRESS },
    })
  })
  it('resolveFromTo is correct for internal address', async () => {
    expect(await payments.resolveFromTo(0, addresses[2])).toEqual({
      fromAddress: addresses[0],
      fromIndex: 0,
      fromExtraId: undefined,
      fromPayport: { address: addresses[0] },
      toAddress: addresses[2],
      toIndex: null,
      toExtraId: undefined,
      toPayport: { address: addresses[2] },
    })
  })
  it('resolveFromTo throws for address as from', async () => {
    await expect(payments.resolveFromTo(EXTERNAL_ADDRESS as any, 0)).rejects.toThrow()
  })

  it('get a balance using an index', async () => {
    expect(await payments.getBalance(1)).toEqual({
      confirmedBalance: '0',
      unconfirmedBalance: '0',
      spendableBalance: '0',
      sweepable: false,
      requiresActivation: false,
    })
  })
  it('get a balance using an address', async () => {
    expect(await payments.getBalance({ address: addresses[0] })).toEqual({
      confirmedBalance: '0',
      unconfirmedBalance: '0',
      spendableBalance: '0',
      sweepable: false,
      requiresActivation: false,
    })
  })
}
