import { TransactionStatus, BalanceActivity, NetworkType, GetBalanceActivityOptions, FeeLevel, FeeRateType } from '@faast/payments-common'
import BigNumber from 'bignumber.js'
import { sortBy } from 'lodash'
import StellarHD from 'stellar-hd-wallet'
import crypto from 'crypto'

import {
  isValidAddress, StellarSignedTransaction, AccountStellarPayments,
  StellarTransactionInfo, StellarBalanceMonitor,
} from '../src'
import { padLeft } from '../src/utils'

import {
  setupTestnetPayments,
  delay,
  END_TRANSACTION_STATES,
  expectEqualWhenTruthy,
  logger,
} from './utils'

jest.setTimeout(60 * 1000)

const FRESH_INDEX = Math.floor(Date.now() / 1000) - 1573074564
const FRESH_ADDRESS = StellarHD.fromSeed('1234').getPublicKey(FRESH_INDEX)
const UNACTIVATED_ADDRESS = StellarHD.fromSeed(crypto.randomBytes(8)).getPublicKey(0)

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
    it('should return when account not activated', async () => {
      expect(await payments.getBalance(UNACTIVATED_ADDRESS)).toEqual({
        confirmedBalance: '0',
        unconfirmedBalance: '0',
        spendableBalance: '0',
        sweepable: false,
        requiresActivation: true,
        minimumBalance: '1',
      })
    })
  })

  describe('createTransaction', () => {
    it('should create tx correctly when sequenceNumber option provided', async () => {
      const sequenceNumber = 5
      const tx = await payments.createTransaction(0, 1, '1.2', { sequenceNumber })
      expect(tx.sequenceNumber).toEqual(String(sequenceNumber))
    })

    it('throws when sending less than 1 XLM to unactivated account', async () => {
      await expect(payments.createTransaction(0, UNACTIVATED_ADDRESS, '0.5')).rejects.toThrow('Cannot send')
    })
  })

  describe('createSweepTransaction', () => {
    it('uses spendable balance', async () => {
      const { spendableBalance } = await payments.getBalance(0)
      const tx = await payments.createSweepTransaction(0, UNACTIVATED_ADDRESS)
      expect(new BigNumber(tx.amount).plus(tx.fee).toString()).toBe(spendableBalance)
    })
  })

  describe('broadcastTransaction', () => {
    it('handles request errors', async () => {
      await expect(payments.broadcastTransaction({
        id: '',
        fee: '0.00001',
        data: {
          serializedTx: 'AAAAALnz8HxfXnQ9n5RzXR4+NHTDWl/lkVxF8zxoFV5YmwfcAAAAZAHD52IAAAASAAAAAQAAAAAAAAAAAAAAAF8XIkIAAAABAAAACjEwNjIzMDk1ODMAAAAAAAEAAAAAAAAAAQAAAAAOr5CG1ax6qG2fBEgXJlF0sw5W0irOS6N/NRDbavBm4QAAAAAAAAACXm1iWgAAAAAAAAABWJsH3AAAAEDya9FtoZGghZ4T0GXIE2n+AfqqazClXVCssXjEP7UdG/xioZTZgNyhIOsI84G6frcGxK7e9F++L09XvoiV/E0F'
        },
        amount: '1017.4161498',
        status: TransactionStatus.Signed,
        toIndex: null,
        fromIndex: 48,
        toAddress: 'GAHK7EEG2WWHVKDNT4CEQFZGKF2LGDSW2IVM4S5DP42RBW3K6BTODB4A',
        toExtraId: '1062309583',
        fromAddress: 'GC47H4D4L5PHIPM7SRZV2HR6GR2MGWS74WIVYRPTHRUBKXSYTMD5YUF2',
        fromExtraId: '48',
        targetFeeRate: '0.00001',
        sequenceNumber: '127199622589317138',
        targetFeeLevel: FeeLevel.Custom,
        targetFeeRateType: FeeRateType.Main,
      })).rejects.toThrow(
        'submitTransaction failed: Request failed with status code 400 -- {\"type\":\"https://stellar.org/horizon-errors/transaction_failed\"'
      )
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
    expect(tx.sequenceNumber).toMatch(/[1-9]/)
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

  let sweepTxPromise: Promise<StellarTransactionInfo>
  let sendTxPromise: Promise<StellarTransactionInfo>
  let sendFreshTxPromise: Promise<StellarTransactionInfo>

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
  }, 300 * 1000)

  it('end to end send', async () => {
    const sourceIndex = 0
    const recipientIndex = 5
    const sendAmount = '1.222'

    const unsignedTx = await payments.createTransaction(sourceIndex, recipientIndex, sendAmount)
    const signedTx = await payments.signTransaction(unsignedTx)
    logger.log(`Sending ${signedTx.amount} XLM from ${sourceIndex} to ${recipientIndex} in tx ${signedTx.id}`)
    const broadcastResult = await payments.broadcastTransaction(signedTx)
    expect(broadcastResult.id).toBeTruthy()
    expect(broadcastResult.rebroadcast).toBe(false)
    sendTxPromise = pollSignedTx(broadcastResult.id, signedTx)
    const tx = await sendTxPromise
    expect(tx.amount).toEqual(sendAmount)
    const fee = new BigNumber(tx.fee)
    expect(fee.toNumber()).toBeGreaterThan(0)
  }, 300 * 1000)

  it('end to end send to fresh address', async () => {
    const sourceIndex = 0
    const recipientAddress = FRESH_ADDRESS
    const sendAmount = '1.111'

    const unsignedTx = await payments.createTransaction(sourceIndex, recipientAddress, sendAmount)
    const signedTx = await payments.signTransaction(unsignedTx)
    logger.log(`Sending ${signedTx.amount} XLM from ${sourceIndex} to fresh address ${recipientAddress} in tx ${signedTx.id}`)
    const broadcastResult = await payments.broadcastTransaction(signedTx)
    expect(broadcastResult.id).toBeTruthy()
    expect(broadcastResult.rebroadcast).toBe(false)
    sendFreshTxPromise = pollSignedTx(broadcastResult.id, signedTx)
    const tx = await sendFreshTxPromise
    expect(tx.amount).toEqual(sendAmount)
    const fee = new BigNumber(tx.fee)
    expect(fee.toNumber()).toBeGreaterThan(0)
  }, 300 * 1000)

  function getExpectedActivitySequence(tx: StellarTransactionInfo, type: 'out' | 'in'): string {
    return `${padLeft((tx.confirmationNumber || 0).toString(), 12, '0')}.${padLeft((tx.confirmationTimestamp as Date).getTime().toString(), 18, '0')}.${type === 'out' ? '00' : '01'}`
  }

  async function getExpectedDepositActivities() {
    const sweepTx = await sweepTxPromise
    const sendTx = await sendTxPromise
    const sendFreshTx = await sendFreshTxPromise
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
    const sendFreshTx = await sendFreshTxPromise
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
      {
        address: sendFreshTx.fromAddress,
        amount: `-${new BigNumber(sendFreshTx.amount).plus(sendFreshTx.fee)}`,
        assetSymbol: 'XLM',
        confirmationId: sendFreshTx.confirmationId,
        confirmationNumber: sendFreshTx.confirmationNumber,
        externalId: sendFreshTx.id,
        extraId: null,
        networkSymbol: 'XLM',
        networkType: NetworkType.Testnet,
        timestamp: sendFreshTx.confirmationTimestamp,
        activitySequence: getExpectedActivitySequence(sendFreshTx, 'out'),
        type: 'out',
      },
    ]
  }

  function expectBalanceActivities(actual: any[], expected: any[]) {
    const normalize = (x: any[]) => sortBy(x, ['activitySequence'])
    expect(normalize(actual)).toEqual(normalize(expected))
  }

  describe('StellarBalanceMonitor', () => {
    it.skip('should emit expected balance activities', async () => {
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
      const txs = [
        await sweepTxPromise, await sendTxPromise, await sendFreshTxPromise
      ]
      const from = BigNumber.max(...txs.map((tx) => tx.confirmationNumber || startLedgerVersion))
        .plus(1)
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

    it('should not throw for unactivated address', async () => {
      const activities = await accumulateRetrievedActivities(UNACTIVATED_ADDRESS)
      expect(activities).toEqual([])
    })
  })

})
