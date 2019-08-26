import { TransactionStatus, BalanceActivity, NetworkType, GetBalanceActivityOptions } from '@faast/payments-common'
import BigNumber from 'bignumber.js'
import { omit, sortBy } from 'lodash'

import { setupTestnetPayments, delay, END_TRANSACTION_STATES, expectEqualOmit, expectEqualWhenTruthy } from './utils'
import { AccountRipplePayments, RippleTransactionInfo, RippleBalanceMonitor } from '../src'
import { ADDRESS_REGEX } from '../src/constants'
import { RippleSignedTransaction } from '../src/types'

describe('e2e', async () => {
  let testsComplete: boolean = false
  let rp: AccountRipplePayments
  let bm: RippleBalanceMonitor

  let startLedgerVersion: number
  const balanceActivities: BalanceActivity[] = []

  beforeAll(async () => {
    rp = await setupTestnetPayments()
    await rp.init()
    bm = new RippleBalanceMonitor({
      network: NetworkType.Testnet,
      server: rp.rippleApi,
    })
    await bm.init()
    startLedgerVersion = (await rp.rippleApi.getLedger()).ledgerVersion
    bm.onBalanceActivity(activity => {
      console.log('activity', activity)
      balanceActivities.push(activity)
    })
    await bm.subscribeAddresses(rp.getAddressesToMonitor())
  })
  afterAll(async () => {
    await rp.destroy()
    await bm.destroy()
    testsComplete = true
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
      expect(Number.parseInt(balances.confirmedBalance)).toBeGreaterThan(20)
      expect(balances.unconfirmedBalance).toBe('0')
      expect(balances.sweepable).toBe(true)
    })
    it('should have deposit account balance', async () => {
      const balances = await rp.getBalance(1)
      expect(Number.parseInt(balances.confirmedBalance)).toBeGreaterThan(20)
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

  async function pollUntilEnded(signedTx: RippleSignedTransaction) {
    const txId = signedTx.id
    console.log('polling until ended', txId)
    let tx: RippleTransactionInfo | undefined
    while (!testsComplete && (!tx || !END_TRANSACTION_STATES.includes(tx.status) || tx.confirmations === 0)) {
      try {
        tx = await rp.getTransactionInfo(txId)
      } catch (e) {
        if (e.message.includes('Transaction not found')) {
          console.log('tx not found yet', txId, e.message)
        } else {
          throw e
        }
      }
      await delay(5000)
    }
    if (!tx) {
      throw new Error(`failed to poll until ended ${txId}`)
    }
    console.log(tx.status, tx)
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
    return tx
  }

  async function accumulateRetrievedActivities(
    address: string,
    options?: GetBalanceActivityOptions,
  ): Promise<BalanceActivity[]> {
    const result: BalanceActivity[] = []
    await bm.retrieveBalanceActivities(
      address,
      activity => {
        result.push(activity)
      },
      { from: startLedgerVersion, ...options },
    )
    return result
  }

  jest.setTimeout(300 * 1000)

  let sweepTxPromise: Promise<RippleTransactionInfo>
  let sendTxPromise: Promise<RippleTransactionInfo>

  it('end to end sweep', async () => {
    const indexToSweep = 5
    const recipientIndex = 0
    const payportBalance = '1.333' // Pretend the payport has this much balance

    const unsignedTx = await rp.createSweepTransaction(indexToSweep, recipientIndex, { payportBalance })
    const signedTx = await rp.signTransaction(unsignedTx)
    console.log(`Sweeping ${signedTx.amount} XRP from ${indexToSweep} to ${recipientIndex} in tx ${signedTx.id}`)
    const broadcastResult = await rp.broadcastTransaction(signedTx)
    expectEqualOmit(
      broadcastResult,
      {
        id: signedTx.id,
        rebroadcast: false,
      },
      ['data'],
    )
    sweepTxPromise = pollUntilEnded(signedTx)
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
    console.log(`Sending ${signedTx.amount} XRP from ${indexToSweep} to ${recipientIndex} in tx ${signedTx.id}`)
    const broadcastResult = await rp.broadcastTransaction(signedTx)
    expectEqualOmit(
      broadcastResult,
      {
        id: signedTx.id,
        rebroadcast: false,
      },
      ['data'],
    )
    sendTxPromise = pollUntilEnded(signedTx)
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
        amount: `-${sweepTx.amount}`,
        assetSymbol: 'XRP',
        confirmationId: sweepTx.confirmationId,
        confirmationNumber: sweepTx.confirmationNumber,
        externalId: sweepTx.id,
        extraId: sweepTx.fromExtraId,
        networkSymbol: 'TRX',
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
        networkSymbol: 'TRX',
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
        networkSymbol: 'TRX',
        networkType: NetworkType.Testnet,
        timestamp: sweepTx.confirmationTimestamp,
        type: 'in',
      },
      {
        address: sendTx.fromAddress,
        amount: `-${sendTx.amount}`,
        assetSymbol: 'XRP',
        confirmationId: sendTx.confirmationId,
        confirmationNumber: sendTx.confirmationNumber,
        externalId: sendTx.id,
        extraId: sendTx.fromExtraId,
        networkSymbol: 'TRX',
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
})
