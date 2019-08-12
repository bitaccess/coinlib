import { setupTestnetPayments, delay, END_TRANSACTION_STATES, expectEqualOmit, expectEqualWhenTruthy } from './utils'
import { AccountRipplePayments, RippleTransactionInfo } from '../src'
import { ADDRESS_REGEX } from '../src/constants'
import { BalanceResult, BaseTransactionInfo, TransactionStatus } from '@faast/payments-common'
import BigNumber from 'bignumber.js'
import { RippleSignedTransaction } from '../src/types'

describe('AccountRipplePayments', async () => {
  let rp: AccountRipplePayments
  let testsComplete: boolean = false
  beforeAll(async () => {
    rp = await setupTestnetPayments()
    await rp.setup()
  })
  afterAll(async () => {
    await rp.destroy()
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

  jest.setTimeout(300 * 1000)

  it('end to end sweep', async () => {
    const indexToSweep = 5
    const recipientIndex = 0
    const payportBalance = '1.234' // Pretend the payport has this much balance

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
    const tx = await pollUntilEnded(signedTx)
    const amount = new BigNumber(tx.amount)
    const fee = new BigNumber(tx.fee)
    const sendTotal = amount.plus(fee)
    expect(sendTotal.toString()).toEqual(payportBalance)
  })

  it('end to end send', async () => {
    const indexToSweep = 0
    const recipientIndex = 5
    const sendAmount = '1.234' // Pretend the payport has this much balance

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
    const tx = await pollUntilEnded(signedTx)
    expect(tx.amount).toEqual(sendAmount)
    const fee = new BigNumber(tx.fee)
    expect(fee.toNumber()).toBeGreaterThan(0)
  })
})
