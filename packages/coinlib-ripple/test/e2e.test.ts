import {
  TransactionStatus,
  BalanceActivity,
  NetworkType,
  GetBalanceActivityOptions,
  FeeRateType
} from '@bitaccess/coinlib-common'
import BigNumber from 'bignumber.js'
import { omit, sortBy } from 'lodash'

import { hdAccount } from './fixtures/accounts'
import {
  setupTestnetPayments,
  delay,
  END_TRANSACTION_STATES,
  expectEqualOmit,
  expectEqualWhenTruthy,
  logger,
} from './utils'
import {
  ADDRESS_REGEX, RippleSignedTransaction, AccountRipplePayments,
  RippleTransactionInfo, RippleBalanceMonitor,
} from '../src'
import { deriveSignatory } from '../src/bip44'

const HOT_ADDRESS = 'rhXkXUw4k23vK5hUG7ozWzQDwxcMMVr9y3'
const DEPOSIT_ADDRESS = 'rjU2XsF45bnBZ8dKKsUwoP43jWygScSYa'

const UNACTIVATED_ADDRESS = deriveSignatory(hdAccount.XPUB, 12439585).address

jest.setTimeout(60 * 1000)

describe('e2e', () => {
  let testsComplete: boolean = false
  let rp: AccountRipplePayments
  let bm: RippleBalanceMonitor
  let bmMainnet: RippleBalanceMonitor

  let startLedgerVersion: number
  const balanceActivities: BalanceActivity[] = []

  beforeAll(async () => {
    rp = await setupTestnetPayments()
    await rp.init()
    bm = new RippleBalanceMonitor({
      logger,
      network: NetworkType.Testnet,
      api: rp.api,
    })
    await bm.init()
    bmMainnet = new RippleBalanceMonitor({
      logger,
      network: NetworkType.Mainnet,
      server: 'wss://s2.ripple.com/',
    })
    await bmMainnet.init()
    startLedgerVersion = (await rp.api.getLedger()).ledgerVersion
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
    it('should detect server when passed rippleApi', () => {
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
    it('should return when account not activated', async () => {
      expect(await rp.getBalance(UNACTIVATED_ADDRESS)).toEqual({
        confirmedBalance: '0',
        unconfirmedBalance: '0',
        spendableBalance: '0',
        sweepable: false,
        requiresActivation: true,
        minimumBalance: '20',
      })
    })
  })

  describe('createTransaction', () => {
    it('should create tx correctly when sequenceNumber option provided', async () => {
      const sequenceNumber = '5'
      const tx = await rp.createTransaction(0, 1, '1.2', { sequenceNumber })
      expect(tx.fromAddress).toBe(HOT_ADDRESS)
      expect(tx.toAddress).toBe(DEPOSIT_ADDRESS)
      expect(tx.sequenceNumber).toEqual(sequenceNumber)
      expect((tx.data as any).instructions.sequence).toBe(parseInt(sequenceNumber))
    })

    it('throws when sending less than 20 XRP to unactivated account', async () => {
      await expect(rp.createTransaction(0, UNACTIVATED_ADDRESS, '10')).rejects.toThrow('Cannot send')
    })

    it('should correctly set fee instruction', async () => {
      const fee = '0.001642'
      const tx = await rp.createTransaction(0, 1, '1.2', {
        feeRate: fee,
        feeRateType: FeeRateType.Main,
      })
      expect(tx.fee).toBe(fee)
      expect((tx.data as any).instructions.fee).toBe(fee)
    })
  })

  describe('createServiceTransaction', () => {
    it('should create settings tx that enables require destination tag', async () => {
      // Use hotwallet here because this setting is already enabled on deposit address
      const serviceTx = await rp.createServiceTransaction(0)
      expect(serviceTx).toBeDefined()
      expect(serviceTx.status).toBe(TransactionStatus.Unsigned)
      expect(serviceTx.fromAddress).toBe(HOT_ADDRESS)
      expect(serviceTx.fromExtraId).toBe(null)
      expect(serviceTx.amount).toBe('')
      expect((serviceTx.data as any).txJSON).toMatch(
        new RegExp(`^\\{"TransactionType":"AccountSet","Account":"${HOT_ADDRESS}","SetFlag":1,"Flags":2147483648,"Fee":"[0-9]+","LastLedgerSequence":[0-9]+,"Sequence":[0-9]+\\}$`)
      )
    })

    it('should throw when setting already enabled', async () => {
      await expect(() => rp.createServiceTransaction(1)).rejects.toThrow('require destination tag setting already enabled')
    })
  })

  describe('createSweepTransaction', () => {
    it('uses spendable balance', async () => {
      const { spendableBalance } = await rp.getBalance(0)
      const tx = await rp.createSweepTransaction(0, UNACTIVATED_ADDRESS)
      expect(new BigNumber(tx.amount).plus(tx.fee).toString()).toBe(spendableBalance)
    })
  })

  async function pollTxId(txId: string) {
    logger.log('polling until ended', txId)
    let tx: RippleTransactionInfo | undefined
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

  async function pollSignedTx(signedTx: RippleSignedTransaction) {
    const txId = signedTx.id
    const tx = await pollTxId(txId)
    expect(tx.id).toBe(signedTx.id)
    expect(tx.fromAddress).toBe(signedTx.fromAddress)
    expectEqualWhenTruthy(tx.fromExtraId, signedTx.fromExtraId)
    expect(tx.toAddress).toBe(signedTx.toAddress)
    expectEqualWhenTruthy(tx.toExtraId, signedTx.toExtraId)
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
    balanceMonitor: RippleBalanceMonitor = bm,
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

  let sweepTxPromise: Promise<RippleTransactionInfo>
  let sendTxPromise: Promise<RippleTransactionInfo>

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

  describe('RippleBalanceMonitor', () => {

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
      const from = BigNumber.max(
        sweepTx.confirmationNumber || startLedgerVersion,
        sendTx.confirmationNumber || startLedgerVersion,
      ).plus(1)
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
        confirmationNumber: '49684654',
        timestamp: new Date('2019-08-30T01:11:52.000Z'),
      })
    })

    it('should not throw for unactivated address', async () => {
      const activities = await accumulateRetrievedActivities(UNACTIVATED_ADDRESS)
      expect(activities).toEqual([])
    })
  })

  it('should retry after being disconnected', async () => {
    await rp.api.disconnect()
    expect(await rp.getBalance(0)).toBeDefined()
  })
})
