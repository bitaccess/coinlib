import { NetworkType } from '@bitaccess/coinlib-common'
import {
  UHdLitecoinPayments,
  HdLitecoinPaymentsConfig,
  UHdLitecoinPaymentsConfig,
  SinglesigAddressType,
  LitecoinAddressFormat,
} from '../src'
import { seedAccountsByAddressType, seedAccountsXPrv } from './fixtures'
import { logger } from './utils'
import { runHardcodedPublicKeyTests } from './helpers'

jest.setTimeout(30 * 1000)

const validAddressFormat = LitecoinAddressFormat.Modern

describe('UHdLitecoinPayments', () => {
  describe('static', () => {
    it('should throw on invalid uniPubKey', () => {
      expect(() => new UHdLitecoinPayments({ uniPubKey: 'invalid' })).toThrow()
    })
    it('should accept valid xprv as uniPubKey for testnet', () => {
      expect(
        new UHdLitecoinPayments({
          network: NetworkType.Testnet,
          uniPubKey:
            'xprv9z7JUNTvAbwNTCJyuqz6rR9dCykBa5krATdkLD8VbXPSgxPSY3jLEqd422aDQiYW9irybEjAwusd9kb7TD7Uckjht9T6GQv7Akee6S6Mtmg',
        }),
      )
    })
  })

  for (const k in seedAccountsByAddressType) {
    const addressType = k as SinglesigAddressType
    const accountFixture = seedAccountsByAddressType[addressType]

    describe(addressType, () => {
      describe('hardcoded xpub', () => {
        const config: UHdLitecoinPaymentsConfig = {
          uniPubKey: accountFixture.xpub,
          network: NetworkType.Mainnet,
          addressType,
          logger,
          validAddressFormat,
        }

        const oldConfig: HdLitecoinPaymentsConfig = {
          hdKey: accountFixture.xpub,
          network: NetworkType.Mainnet,
          addressType,
          logger,
        }
        const payments = new UHdLitecoinPayments(config)

        runHardcodedPublicKeyTests(payments, oldConfig, accountFixture)
      })

      describe('hardcoded xprv', () => {
        const config: UHdLitecoinPaymentsConfig = {
          seed: accountFixture.seed,
          network: NetworkType.Mainnet,
          addressType,
          logger,
          validAddressFormat,
        }

        const oldConfig: HdLitecoinPaymentsConfig = {
          hdKey: seedAccountsXPrv,
          network: NetworkType.Mainnet,
          addressType,
          logger,
        }
        const payments = new UHdLitecoinPayments(config)

        runHardcodedPublicKeyTests(payments, oldConfig, accountFixture)
      })
    })
  }
})

// function runHardcodedPublicKeyTests(
//   payments: UHdLitecoinPayments,
//   config: HdLitecoinPaymentsConfig,
//   accountFixture: SeedAccountFixture,
// ) {
//   const { xpub, addresses, derivationPath } = accountFixture
//   it('getFullConfig', () => {
//     expect(payments.getFullConfig()).toEqual({
//       hdKey: config.hdKey,
//       network: config.network,
//       derivationPath,
//       addressType: config.addressType,
//       logger,
//       validAddressFormat,
//     })
//   })
//   it('getPublicConfig', () => {
//     expect(payments.getPublicConfig()).toEqual({
//       hdKey: xpub,
//       network: config.network,
//       derivationPath,
//       addressType: config.addressType,
//       validAddressFormat,
//     })
//   })
//   it('getAccountIds', () => {
//     expect(payments.getAccountIds()).toEqual([xpub])
//   })
//   it('getAccountId for index 0', () => {
//     expect(payments.getAccountId(0)).toEqual(xpub)
//   })
//   it('getAccountId for index 10', () => {
//     expect(payments.getAccountId(10)).toEqual(xpub)
//   })
//   it('getXpub', async () => {
//     expect(payments.xpub).toEqual(xpub)
//   })
//   for (const iString of Object.keys(accountFixture.addresses)) {
//     const i = Number.parseInt(iString)
//     it(`getPayport for index ${i}`, async () => {
//       const actual = await payments.getPayport(i)
//       expect(actual).toEqual({ address: addresses[i] })
//     })
//   }
//   it('resolvePayport resolves for index 1', async () => {
//     expect(await payments.resolvePayport(1)).toEqual({ address: addresses[1] })
//   })
//   it('resolvePayport resolves for address', async () => {
//     expect(await payments.resolvePayport(addresses[1])).toEqual({ address: addresses[1] })
//   })
//   it('resolvePayport resolves for external address', async () => {
//     expect(await payments.resolvePayport(EXTERNAL_ADDRESS)).toEqual({ address: EXTERNAL_ADDRESS })
//   })
//   it('resolvePayport resolves for payport', async () => {
//     const payport = { address: addresses[1] }
//     expect(await payments.resolvePayport(payport)).toEqual(payport)
//   })
//   it('resolvePayport throws for invalid address', async () => {
//     await expect(payments.resolvePayport('invalid')).rejects.toThrow()
//   })
//   it('resolvePayport throws for address in invalid format', async () => {
//     await expect(payments.resolvePayport(ADDRESS_SEGWIT_P2SH_DEPRECATED)).rejects.toThrow()
//   })
//   it('resolveFromTo is correct for (index, index)', async () => {
//     expect(await payments.resolveFromTo(0, 2)).toEqual({
//       fromAddress: addresses[0],
//       fromIndex: 0,
//       fromExtraId: undefined,
//       fromPayport: { address: addresses[0] },
//       toAddress: addresses[2],
//       toIndex: 2,
//       toExtraId: undefined,
//       toPayport: { address: addresses[2] },
//     })
//   })
//   it('resolveFromTo is correct for external address', async () => {
//     expect(await payments.resolveFromTo(0, EXTERNAL_ADDRESS)).toEqual({
//       fromAddress: addresses[0],
//       fromIndex: 0,
//       fromExtraId: undefined,
//       fromPayport: { address: addresses[0] },
//       toAddress: EXTERNAL_ADDRESS,
//       toIndex: null,
//       toExtraId: undefined,
//       toPayport: { address: EXTERNAL_ADDRESS },
//     })
//   })
//   it('resolveFromTo is correct for internal address', async () => {
//     expect(await payments.resolveFromTo(0, addresses[2])).toEqual({
//       fromAddress: addresses[0],
//       fromIndex: 0,
//       fromExtraId: undefined,
//       fromPayport: { address: addresses[0] },
//       toAddress: addresses[2],
//       toIndex: null,
//       toExtraId: undefined,
//       toPayport: { address: addresses[2] },
//     })
//   })
//   it('resolveFromTo throws for address as from', async () => {
//     await expect(payments.resolveFromTo(EXTERNAL_ADDRESS as any, 0)).rejects.toThrow()
//   })

//   it('get a balance using an index', async () => {
//     expect(await payments.getBalance(1)).toEqual({
//       confirmedBalance: '0',
//       unconfirmedBalance: '0',
//       spendableBalance: '0',
//       sweepable: false,
//       requiresActivation: false,
//     })
//   })
//   it('get a balance using an address', async () => {
//     expect(await payments.getBalance({ address: addresses[0] })).toEqual({
//       confirmedBalance: '0',
//       unconfirmedBalance: '0',
//       spendableBalance: '0',
//       sweepable: false,
//       requiresActivation: false,
//     })
//   })
// }
