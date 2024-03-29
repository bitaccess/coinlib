import { NetworkType } from '@bitaccess/coinlib-common'
import { BitcoinCashAddressFormat, HdBitcoinCashPayments, UHdBitcoinCashPayments, HdBitcoinCashPaymentsConfig } from '../src'

import { EXTERNAL_ADDRESS,TESTNET_EXTERNAL_ADDRESS, AccountFixture, ADDRESS_LEGACY } from './fixtures'
import { logger } from './utils'

export function runHardcodedPublicKeyTests(
    payments: HdBitcoinCashPayments | UHdBitcoinCashPayments,
    config: HdBitcoinCashPaymentsConfig | HdBitcoinCashPaymentsConfig,
    accountFixture: AccountFixture,
  ) {
    let externalAddress: string
  if (config.network === NetworkType.Testnet) {
    externalAddress = TESTNET_EXTERNAL_ADDRESS
  } else {
    externalAddress = EXTERNAL_ADDRESS
  }
  const { xpub, addresses, derivationPath } = accountFixture
  it('getFullConfig', () => {
    expect(payments.getFullConfig()).toEqual({
      hdKey: config.hdKey,
      network: config.network,
      derivationPath,
      logger,
      validAddressFormat: BitcoinCashAddressFormat.Cash,
    })
  })
  it('getPublicConfig', () => {
    expect(payments.getPublicConfig()).toEqual({
      hdKey: xpub,
      network: config.network,
      derivationPath,
      validAddressFormat: BitcoinCashAddressFormat.Cash,
    })
  })
  it('getAccountIds', () => {
    expect(payments.getAccountIds()).toEqual([xpub])
  })
  it('getAccountId for index 0', () => {
    expect(payments.getAccountId(0)).toEqual(xpub)
  })
  it('getAccountId for index 10', () => {
    expect(payments.getAccountId(10)).toEqual(xpub)
  })
  it('getXpub', async () => {
    expect(payments.xpub).toEqual(xpub)
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
    expect(await payments.resolvePayport(externalAddress)).toEqual({ address: externalAddress })
  })
  it('resolvePayport resolves for payport', async () => {
    const payport = { address: addresses[1] }
    expect(await payments.resolvePayport(payport)).toEqual(payport)
  })
  it('resolvePayport throws for invalid address', async () => {
    await expect(payments.resolvePayport('invalid')).rejects.toThrow()
  })
  it('resolvePayport throws for address in invalid format', async () => {
    await expect(payments.resolvePayport(ADDRESS_LEGACY)).rejects.toThrow()
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
    expect(await payments.resolveFromTo(0, externalAddress)).toEqual({
      fromAddress: addresses[0],
      fromIndex: 0,
      fromExtraId: undefined,
      fromPayport: { address: addresses[0] },
      toAddress: externalAddress,
      toIndex: null,
      toExtraId: undefined,
      toPayport: { address: externalAddress },
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
    await expect(payments.resolveFromTo(externalAddress as any, 0)).rejects.toThrow()
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
    const { confirmedBalance, unconfirmedBalance, spendableBalance } = accountFixture.firstAccountBalanceStatus
    expect(await payments.getBalance({ address: addresses[0] })).toEqual({
      confirmedBalance,
      unconfirmedBalance,
      spendableBalance,
      sweepable: true,
      requiresActivation: false,
    })
  })
  }
  

