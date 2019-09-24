import { TransactionStatus, BalanceActivity, NetworkType, GetBalanceActivityOptions } from '@faast/payments-common'
import BigNumber from 'bignumber.js'
import { omit, sortBy } from 'lodash'

import {
  setupTestnetPayments,
  delay,
  END_TRANSACTION_STATES,
  expectEqualOmit,
  expectEqualWhenTruthy,
  logger,
} from './utils'
import { AccountStellarPayments, StellarTransactionInfo, StellarBalanceMonitor } from '../src'
import { ADDRESS_REGEX } from '../src/constants'
import { StellarSignedTransaction } from '../src/types'

jest.setTimeout(60 * 1000)

describe('e2e', () => {
  let testsComplete: boolean = false
  let rp: AccountStellarPayments
  let bm: StellarBalanceMonitor
  let bmMainnet: StellarBalanceMonitor

  let startLedgerVersion: number
  const balanceActivities: BalanceActivity[] = []

  beforeAll(async () => {
    rp = await setupTestnetPayments()
    await rp.init()
    bm = new StellarBalanceMonitor({
      logger,
      network: NetworkType.Testnet,
      server: rp.stellarApi,
    })
    await bm.init()
    bmMainnet = new StellarBalanceMonitor({
      logger,
      network: NetworkType.Mainnet,
      server: 'wss://s2.stellar.com/',
    })
    await bmMainnet.init()
    startLedgerVersion = (await rp.stellarApi.getLedger()).ledgerVersion
    bm.onBalanceActivity(activity => {
      logger.log('activity', activity)
      balanceActivities.push(activity)
    })
    await bm.subscribeAddresses(rp.getAddressesToMonitor())
  }, 120 * 1000)

  afterAll(async () => {
    if (rp) await rp.destroy()
    if (bm) await bm.destroy()
    if (bmMainnet) await bmMainnet.destroy()
    testsComplete = true
  }, 120 * 1000)

  describe('properties', () => {
    it('should detect server when passed stellarApi', () => {
      expect(bm.server).toBe(rp.server)
    })
  })

  describe('getPayport', () => {
    it('index 0 should return hot account address', async () => {
      const pp = await rp.getPayport(0)
      expect(pp.address).toMatch(ADDRESS_REGEX)
      expect(pp.extraId).toBe(undefined)
    })
    it('index 1 should return deposit account address', async () => {
      const pp = await rp.getPayport(1)
      expect(pp.address).toMatch(ADDRESS_REGEX)
      expect(pp.extraId).toBe(undefined)
    })
    it('index 2 should return deposit account address plus extraId', async () => {
      const pp = await rp.getPayport(2)
      expect(pp.address).toMatch(ADDRESS_REGEX)
      expect(pp.extraId).toBe('2')
    })
  })

  describe('getBalance', () => {
    it('should have hot account balance', async () => {
      const balances = await rp.getBalance(0)
      expect(Number.parseInt(balances.confirmedBalance)).toBeGreaterThan(0)
      expect(balances.unconfirmedBalance).toBe('0')
      expect(balances.sweepable).toBe(true)
    })
    it('should have deposit account balance', async () => {
      const balances = await rp.getBalance(1)
      expect(Number.parseInt(balances.confirmedBalance)).toBeGreaterThan(0)
      expect(balances.unconfirmedBalance).toBe('0')
      expect(balances.sweepable).toBe(true)
    })
    it('should get balance of address', async () => {
      const balances = await rp.getBalance({ address: rp.hotSignatory.address })
      expect(Number.parseInt(balances.confirmedBalance)).toBeGreaterThan(0)
      expect(balances.unconfirmedBalance).toBe('0')
      expect(balances.sweepable).toBe(true)
    })
  })

  async function pollTxId(txId: string) {
    logger.log('polling until ended', txId)
    let tx: StellarTransactionInfo | undefined
    while (!testsComplete && (!tx || !END_TRANSACTION_STATES.includes(tx.status) || tx.confirmations === 0)) {
      try {
        tx = await rp.getTransactionInfo(txId)
      } catch (e) {
        if (e.message.includes('Transaction not found')) {
          logger.log('tx not found yet', txId, e.message)
        } else {
          throw e
        }
      }
      await delay(5000)
    }
    if (!tx) {
      throw new Error(`failed to poll until ended ${txId}`)
    }
    logger.log(tx.status, tx)
    return tx
  }

  async function pollSignedTx(signedTx: StellarSignedTransaction) {
    const txId = signedTx.id
    const tx = await pollTxId(txId)
    expect(tx.id).toBe(signedTx.id)
    expect(tx.fromAddress).toBe(signedTx.fromAddress)
    expectEqualWhenTruthy(tx.fromExtraId, signedTx.fromExtraId)
    expect(tx.fromIndex).toBe(signedTx.fromIndex)
    expect(tx.toAddress).toBe(signedTx.toAddress)
    expectEqualWhenTruthy(tx.toExtraId, signedTx.toExtraId)
    expect(tx.toIndex).toBe(signedTx.toIndex)
    expect(tx.data).toBeDefined()
    expect(tx.status).toBe(TransactionStatus.Confirmed)
    expect(tx.isConfirmed).toBe(true)
    expect(tx.isExecuted).toBe(true)
    expect(tx.confirmationId).toMatch(/^\w+$/)
    expect(tx.confirmationTimestamp).toBeDefined()
    expect(tx.confirmations).toBeGreaterThan(0)
    expect(tx.sequenceNumber).toBeGreaterThan(0)
    return tx
  }

  async function accumulateRetrievedActivities(
    address: string,
    options?: GetBalanceActivityOptions,
    balanceMonitor: StellarBalanceMonitor = bm,
  ): Promise<BalanceActivity[]> {
    const result: BalanceActivity[] = []
    await balanceMonitor.retrieveBalanceActivities(
      address,
      activity => {
        result.push(activity)
      },
      { from: startLedgerVersion, ...options },
    )
    return result
  }

  jest.setTimeout(300 * 1000)

  let sweepTxPromise: Promise<StellarTransactionInfo>
  let sendTxPromise: Promise<StellarTransactionInfo>

  it('end to end sweep', async () => {
    const indexToSweep = 5
    const recipientIndex = 0
    const payportBalance = '1.333' // Pretend the payport has this much balance

    const unsignedTx = await rp.createSweepTransaction(indexToSweep, recipientIndex, { payportBalance })
    const signedTx = await rp.signTransaction(unsignedTx)
    logger.log(`Sweeping ${signedTx.amount} XRP from ${indexToSweep} to ${recipientIndex} in tx ${signedTx.id}`)
    const broadcastResult = await rp.broadcastTransaction(signedTx)
    expectEqualOmit(
      broadcastResult,
      {
        id: signedTx.id,
        rebroadcast: false,
      },
      ['data'],
    )
    sweepTxPromise = pollSignedTx(signedTx)
    const tx = await sweepTxPromise
    const amount = new BigNumber(tx.amount)
    const fee = new BigNumber(tx.fee)
    const sendTotal = amount.plus(fee)
    expect(sendTotal.toString()).toEqual(payportBalance)
  })

  it('end to end send', async () => {
    const indexToSweep = 0
    const recipientIndex = 5
    const sendAmount = '1.222' // Pretend the payport has this much balance

    const unsignedTx = await rp.createTransaction(indexToSweep, recipientIndex, sendAmount)
    const signedTx = await rp.signTransaction(unsignedTx)
    logger.log(`Sending ${signedTx.amount} XRP from ${indexToSweep} to ${recipientIndex} in tx ${signedTx.id}`)
    const broadcastResult = await rp.broadcastTransaction(signedTx)
    expectEqualOmit(
      broadcastResult,
      {
        id: signedTx.id,
        rebroadcast: false,
      },
      ['data'],
    )
    sendTxPromise = pollSignedTx(signedTx)
    const tx = await sendTxPromise
    expect(tx.amount).toEqual(sendAmount)
    const fee = new BigNumber(tx.fee)
    expect(fee.toNumber()).toBeGreaterThan(0)
  })

  async function getExpectedDepositActivities() {
    const sweepTx = await sweepTxPromise
    const sendTx = await sendTxPromise
    return [
      {
        address: sweepTx.fromAddress,
        amount: `-${new BigNumber(sweepTx.amount).plus(sweepTx.fee)}`,
        assetSymbol: 'XRP',
        confirmationId: sweepTx.confirmationId,
        confirmationNumber: sweepTx.confirmationNumber,
        externalId: sweepTx.id,
        extraId: sweepTx.fromExtraId,
        networkSymbol: 'XRP',
        networkType: NetworkType.Testnet,
        timestamp: sweepTx.confirmationTimestamp,
        type: 'out',
      },
      {
        address: sendTx.toAddress,
        amount: sendTx.amount,
        assetSymbol: 'XRP',
        confirmationId: sendTx.confirmationId,
        confirmationNumber: sendTx.confirmationNumber,
        externalId: sendTx.id,
        extraId: sendTx.toExtraId,
        networkSymbol: 'XRP',
        networkType: NetworkType.Testnet,
        timestamp: sendTx.confirmationTimestamp,
        type: 'in',
      },
    ]
  }

  async function getExpectedHotActivities() {
    const sweepTx = await sweepTxPromise
    const sendTx = await sendTxPromise
    return [
      {
        address: sweepTx.toAddress,
        amount: sweepTx.amount,
        assetSymbol: 'XRP',
        confirmationId: sweepTx.confirmationId,
        confirmationNumber: sweepTx.confirmationNumber,
        externalId: sweepTx.id,
        extraId: sweepTx.toExtraId,
        networkSymbol: 'XRP',
        networkType: NetworkType.Testnet,
        timestamp: sweepTx.confirmationTimestamp,
        type: 'in',
      },
      {
        address: sendTx.fromAddress,
        amount: `-${new BigNumber(sendTx.amount).plus(sendTx.fee)}`,
        assetSymbol: 'XRP',
        confirmationId: sendTx.confirmationId,
        confirmationNumber: sendTx.confirmationNumber,
        externalId: sendTx.id,
        extraId: sendTx.fromExtraId,
        networkSymbol: 'XRP',
        networkType: NetworkType.Testnet,
        timestamp: sendTx.confirmationTimestamp,
        type: 'out',
      },
    ]
  }

  function expectBalanceActivities(actual: any[], expected: any[]) {
    const normalize = (x: any[]) => sortBy(x, ['timestamp']).map(a => omit(a, ['activitySequence']))
    expect(normalize(actual)).toEqual(normalize(expected))
  }

  jest.setTimeout(30 * 1000)

  it.skip('should emit expected balance activities', async () => {
    // Can't get subscriptions to work :(
    const hotActivity = await getExpectedHotActivities()
    const depositActivity = await getExpectedDepositActivities()
    expect(balanceActivities).toEqual(hotActivity.concat(depositActivity))
  })

  it('should be able to retrieve the deposit account balance activities', async () => {
    const actual = await accumulateRetrievedActivities(rp.depositSignatory.address)
    const expected = await getExpectedDepositActivities()
    expectBalanceActivities(actual, expected)
  })

  it('should be able to retrieve the hot account balance activities', async () => {
    const actual = await accumulateRetrievedActivities(rp.hotSignatory.address)
    const expected = await getExpectedHotActivities()
    expectBalanceActivities(actual, expected)
  })

  it('should retrieve nothing for a range without activity', async () => {
    const sweepTx = await sweepTxPromise
    const sendTx = await sendTxPromise
    const from =
      1 + Math.max(sweepTx.confirmationNumber || startLedgerVersion, sendTx.confirmationNumber || startLedgerVersion)
    const actual = await accumulateRetrievedActivities(rp.hotSignatory.address, { from })
    expectBalanceActivities(actual, [])
  })

  it.skip('should be able to retrieve more activities than page limit', async () => {
    const actual = await accumulateRetrievedActivities('r3b5PwYSZD48G8VeXoovj3CervMRyPMyVY')
    expect(actual.length).toBeGreaterThan(10)
  })

  it('should recognize balance activity of txs with tec result code', async () => {
    const [activity] = await accumulateRetrievedActivities(
      'rJdLzYr87z7xuey8qAfh3qZ9WmaXaAoELe',
      {
        from: 49684653,
        to: 49684655,
      },
      bmMainnet,
    )
    expect(activity).toEqual({
      type: 'out',
      networkType: 'mainnet',
      networkSymbol: 'XRP',
      assetSymbol: 'XRP',
      address: 'rJdLzYr87z7xuey8qAfh3qZ9WmaXaAoELe',
      extraId: '12',
      amount: '-0.000012',
      externalId: 'F5C7793E506E9566CED0060D9FC519BA06BD0EB0F4A77C0680BEA8FD13A13A58',
      activitySequence: '000049684654.00000040.00',
      confirmationId: '4103BE72C0C718AD2B137C9B40C37AD3D157044A61F40AB74B122A12EFB15B32',
      confirmationNumber: 49684654,
      timestamp: new Date('2019-08-30T01:11:52.000Z'),
    })
  })

  it('should set requireDestinationTag setting correctly after initAccounts', async () => {
    const result = await rp.initAccounts()
    if (result) {
      await pollTxId(result.txId)
    }
    const newSettings = await rp.stellarApi.getSettings(rp.getDepositSignatory().address)
    expect(newSettings.requireDestinationTag).toBe(true)
  })

  it('should retry after being disconnected', async () => {
    await rp.stellarApi.disconnect()
    expect(await rp.getBalance(0)).toBeDefined()
  })
})
