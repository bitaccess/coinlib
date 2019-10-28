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
import { isValidAddress, StellarSignedTransaction, AccountStellarPayments, StellarTransactionInfo, StellarBalanceMonitor } from '../src'
import { padLeft } from '#/utils'

jest.setTimeout(60 * 1000)

describe('e2e', () => {
  let testsComplete: boolean = false
  let payments: AccountStellarPayments
  let monitor: StellarBalanceMonitor
  let monitorMainnet: StellarBalanceMonitor

  let startLedgerVersion: number
  const emittedBalanceActivities: BalanceActivity[] = []

  beforeAll(async () => {
    payments = await setupTestnetPayments()
    await payments.init()
    monitor = new StellarBalanceMonitor({
      logger,
      network: NetworkType.Testnet,
      server: payments.server,
    })
    await monitor.init()
    monitorMainnet = new StellarBalanceMonitor({
      logger,
      network: NetworkType.Mainnet,
    })
    await monitorMainnet.init()
    startLedgerVersion = (await payments.getBlock()).sequence
    monitor.onBalanceActivity(activity => {
      logger.log('onBalanceActivity', activity)
      emittedBalanceActivities.push(activity)
    })
    await monitor.subscribeAddresses(payments.getAddressesToMonitor())
  }, 120 * 1000)

  afterAll(async () => {
    if (payments) await payments.destroy()
    if (monitor) await monitor.destroy()
    if (monitorMainnet) await monitorMainnet.destroy()
    testsComplete = true
  }, 120 * 1000)

  describe('properties', () => {
    it('should detect server when passed stellarApi', () => {
      expect(monitor.server).toBe(payments.server)
    })
  })

  describe('getPayport', () => {
    it('index 0 should return hot account address', async () => {
      const pp = await payments.getPayport(0)
      expect(isValidAddress(pp.address)).toBe(true)
      expect(pp.extraId).toBe(undefined)
    })
    it('index 1 should return deposit account address', async () => {
      const pp = await payments.getPayport(1)
      expect(isValidAddress(pp.address)).toBe(true)
      expect(pp.extraId).toBe(undefined)
    })
    it('index 2 should return deposit account address plus extraId', async () => {
      const pp = await payments.getPayport(2)
      expect(isValidAddress(pp.address)).toBe(true)
      expect(pp.extraId).toBe('2')
    })
  })

  describe('getBalance', () => {
    it('should have hot account balance', async () => {
      const balances = await payments.getBalance(0)
      expect(Number.parseInt(balances.confirmedBalance)).toBeGreaterThan(0)
      expect(balances.unconfirmedBalance).toBe('0')
      expect(balances.sweepable).toBe(true)
    })
    it('should have deposit account balance', async () => {
      const balances = await payments.getBalance(1)
      expect(Number.parseInt(balances.confirmedBalance)).toBeGreaterThan(0)
      expect(balances.unconfirmedBalance).toBe('0')
      expect(balances.sweepable).toBe(true)
    })
    it('should get balance of address', async () => {
      const balances = await payments.getBalance({ address: payments.hotSignatory.address })
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
        tx = await payments.getTransactionInfo(txId)
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

  async function pollSignedTx(txId: string, signedTx: StellarSignedTransaction) {
    const tx = await pollTxId(txId)
    expect(tx.id).toBe(txId)
    expect(tx.fromAddress).toBe(signedTx.fromAddress)

    // Stellar has no way to record fromExtraId so can't properly check it
    expect(tx.fromExtraId).toBe(null)
    if (signedTx.fromIndex === 0) {
      expect(tx.fromIndex).toBe(0)
    } else {
      expect(tx.fromIndex).toBe(1)
    }

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
    balanceMonitor: StellarBalanceMonitor = monitor,
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

    const unsignedTx = await payments.createSweepTransaction(indexToSweep, recipientIndex, { payportBalance })
    const signedTx = await payments.signTransaction(unsignedTx)
    logger.log(`Sweeping ${signedTx.amount} XLM from ${indexToSweep} to ${recipientIndex} in tx ${signedTx.id}`)
    const broadcastResult = await payments.broadcastTransaction(signedTx)
    expect(broadcastResult.id).toBeTruthy()
    expect(broadcastResult.rebroadcast).toBe(false)
    sweepTxPromise = pollSignedTx(broadcastResult.id, signedTx)
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

    const unsignedTx = await payments.createTransaction(indexToSweep, recipientIndex, sendAmount)
    const signedTx = await payments.signTransaction(unsignedTx)
    logger.log(`Sending ${signedTx.amount} XLM from ${indexToSweep} to ${recipientIndex} in tx ${signedTx.id}`)
    const broadcastResult = await payments.broadcastTransaction(signedTx)
    expect(broadcastResult.id).toBeTruthy()
    expect(broadcastResult.rebroadcast).toBe(false)
    sendTxPromise = pollSignedTx(broadcastResult.id, signedTx)
    const tx = await sendTxPromise
    expect(tx.amount).toEqual(sendAmount)
    const fee = new BigNumber(tx.fee)
    expect(fee.toNumber()).toBeGreaterThan(0)
  })

  function getExpectedActivitySequence(tx: StellarTransactionInfo, type: 'out' | 'in'): string {
    return `${padLeft((tx.confirmationNumber || 0).toString(), 12, '0')}.${padLeft((tx.confirmationTimestamp as Date).getTime().toString(), 18, '0')}.${type === 'out' ? '00' : '01'}`
  }

  async function getExpectedDepositActivities() {
    const sweepTx = await sweepTxPromise
    const sendTx = await sendTxPromise
    return [
      {
        address: sweepTx.fromAddress,
        amount: `-${new BigNumber(sweepTx.amount).plus(sweepTx.fee)}`,
        assetSymbol: 'XLM',
        confirmationId: sweepTx.confirmationId,
        confirmationNumber: sweepTx.confirmationNumber,
        externalId: sweepTx.id,
        extraId: null,
        networkSymbol: 'XLM',
        networkType: NetworkType.Testnet,
        timestamp: sweepTx.confirmationTimestamp,
        activitySequence: getExpectedActivitySequence(sweepTx, 'out'),
        type: 'out',
      },
      {
        address: sendTx.toAddress,
        amount: sendTx.amount,
        assetSymbol: 'XLM',
        confirmationId: sendTx.confirmationId,
        confirmationNumber: sendTx.confirmationNumber,
        externalId: sendTx.id,
        extraId: sendTx.toExtraId,
        networkSymbol: 'XLM',
        networkType: NetworkType.Testnet,
        timestamp: sendTx.confirmationTimestamp,
        activitySequence: getExpectedActivitySequence(sendTx, 'in'),
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
        assetSymbol: 'XLM',
        confirmationId: sweepTx.confirmationId,
        confirmationNumber: sweepTx.confirmationNumber,
        externalId: sweepTx.id,
        extraId: sweepTx.toExtraId,
        networkSymbol: 'XLM',
        networkType: NetworkType.Testnet,
        timestamp: sweepTx.confirmationTimestamp,
        activitySequence: getExpectedActivitySequence(sweepTx, 'in'),
        type: 'in',
      },
      {
        address: sendTx.fromAddress,
        amount: `-${new BigNumber(sendTx.amount).plus(sendTx.fee)}`,
        assetSymbol: 'XLM',
        confirmationId: sendTx.confirmationId,
        confirmationNumber: sendTx.confirmationNumber,
        externalId: sendTx.id,
        extraId: null,
        networkSymbol: 'XLM',
        networkType: NetworkType.Testnet,
        timestamp: sendTx.confirmationTimestamp,
        activitySequence: getExpectedActivitySequence(sendTx, 'out'),
        type: 'out',
      },
    ]
  }

  function expectBalanceActivities(actual: any[], expected: any[]) {
    const normalize = (x: any[]) => sortBy(x, ['activitySequence'])
    expect(normalize(actual)).toEqual(normalize(expected))
  }

  jest.setTimeout(30 * 1000)

  it('should emit expected balance activities', async () => {
    const hotActivity = await getExpectedHotActivities()
    const depositActivity = await getExpectedDepositActivities()
    expectBalanceActivities(emittedBalanceActivities, hotActivity.concat(depositActivity))
  })

  it('should be able to retrieve the deposit account balance activities', async () => {
    const actual = await accumulateRetrievedActivities(payments.depositSignatory.address)
    const expected = await getExpectedDepositActivities()
    expectBalanceActivities(actual, expected)
  })

  it('should be able to retrieve the hot account balance activities', async () => {
    const actual = await accumulateRetrievedActivities(payments.hotSignatory.address)
    const expected = await getExpectedHotActivities()
    expectBalanceActivities(actual, expected)
  })

  it('should retrieve nothing for a range without activity', async () => {
    const sweepTx = await sweepTxPromise
    const sendTx = await sendTxPromise
    const from =
      1 + Math.max(sweepTx.confirmationNumber || startLedgerVersion, sendTx.confirmationNumber || startLedgerVersion)
    const actual = await accumulateRetrievedActivities(payments.hotSignatory.address, { from })
    expectBalanceActivities(actual, [])
  })

  it('should be able to retrieve more activities than page limit', async () => {
    const actual = await accumulateRetrievedActivities('GDHMECSDSY3U66WAZMO3RFJXTNCGCFFVHINONHTWU2VPHHRFSBKHWMOL', {
      from: 24895758,
      to: 26463647,
    }, monitorMainnet)
    expect(actual.length).toBeGreaterThan(10)
  })

})
