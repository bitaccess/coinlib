import fs from 'fs'
import path from 'path'
import { BalanceResult, TransactionStatus, NetworkType, FeeRateType } from '@faast/payments-common'

import {
  HdBitcoinPayments, BitcoinTransactionInfo,
  BitcoinSignedTransaction, AddressType, SinglesigAddressType,
} from '../src'

import { END_TRANSACTION_STATES, delay, expectEqualWhenTruthy, logger, expectEqualOmit } from './utils'
import { toBigNumber } from '@faast/ts-common'
import fixtures from './fixtures/singlesigTestnet'
import { HdBitcoinPaymentsConfig } from '../src/types';
import BigNumber from 'bignumber.js';

const SECRET_XPRV_FILE = 'test/keys/testnet.key'

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
    `File ${SECRET_XPRV_FILE} missing. Send and sweep e2e testnet tests will be skipped. To enable them ask Dylan to share the file with you.`,
  )
}

// Commend out elements to disable tests for an address type
const addressTypesToTest: SinglesigAddressType[] = [
  AddressType.Legacy,
  AddressType.SegwitP2SH,
  AddressType.SegwitNative,
];

const describeAll = !secretXprv ? describe.skip : describe

describeAll('e2e testnet', () => {
  let testsComplete = false

  afterAll(() => {
    testsComplete = true
  })

  for (let addressType of addressTypesToTest) {
    const { xpub, addresses } = fixtures[addressType]

    describe(addressType, () => {
      const paymentsConfig: HdBitcoinPaymentsConfig = {
        hdKey: secretXprv,
        network: NetworkType.Testnet,
        addressType,
        logger,
        minChange: '0.01',
        targetUtxoPoolSize: 5,
      }
      const payments = new HdBitcoinPayments(paymentsConfig)
      it('get correct xpub', async () => {
        expect(payments.xpub).toEqual(xpub)
      })
      for (let iStr in addresses) {
        const i = Number.parseInt(iStr)
        it(`get correct address for index ${i}`, async () => {
          expect(await payments.getPayport(i)).toEqual({ address: (addresses as any)[i] })
        })
      }

      async function pollUntilEnded(signedTx: BitcoinSignedTransaction) {
        const txId = signedTx.id
        logger.log('polling until ended', txId)
        let tx: BitcoinTransactionInfo | undefined
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
        return tx
      }

      jest.setTimeout(300 * 1000)

      it('end to end sweep', async () => {
        const indicesToTry = [5, 6]
        const balances: { [i: number]: BalanceResult } = {}
        let indexToSweep: number = -1
        for (const index of indicesToTry) {
          const balanceResult = await payments.getBalance(index)
          balances[index] = balanceResult
          if (balanceResult.sweepable) {
            indexToSweep = index
            break
          }
        }
        if (indexToSweep < 0) {
          const allAddresses = await Promise.all(indicesToTry.map(async i => (await payments.getPayport(i)).address))
          throw new Error(`Cannot end to end test sweeping due to lack of funds. Send testnet BTC to any of the following addresses and try again. ${JSON.stringify(allAddresses)}`)
        }
        const recipientIndex = indexToSweep === indicesToTry[0] ? indicesToTry[1] : indicesToTry[0]
        const satPerByte = 44
        const unsignedTx = await payments.createSweepTransaction(indexToSweep, recipientIndex, {
          feeRate: satPerByte.toString(),
          feeRateType: FeeRateType.BasePerWeight,
          useUnconfirmedUtxos: true,
        })
        const signedTx = await payments.signTransaction(unsignedTx)
        expect(signedTx.inputUtxos).toBeDefined()
        expect(signedTx.inputUtxos!.length).toBe(1)
        expect(signedTx.externalOutputs).toBeDefined()
        expect(signedTx.externalOutputs!.length).toBe(1)
        const feeNumber = new BigNumber(signedTx.fee).toNumber()
        expect(feeNumber).toBe((192*satPerByte)*1e-8)
        logger.log(`Sweeping ${signedTx.amount} from ${indexToSweep} to ${recipientIndex} in tx ${signedTx.id}`)
        expect(await payments.broadcastTransaction(signedTx)).toEqual({
          id: signedTx.id,
        })
        // const tx = await pollUntilEnded(signedTx)
        const tx = await payments.getTransactionInfo(signedTx.id)
        expect(tx.amount).toEqual(signedTx.amount)
        expect(tx.fee).toEqual(signedTx.fee)
      })

      it('end to end send', async () => {
        const indicesToTry = [7, 8]
        const balances: { [i: number]: BalanceResult } = {}
        let indexToSend: number = -1
        let highestBalance = toBigNumber(0)
        for (const index of indicesToTry) {
          const balanceResult = await payments.getBalance(index)
          balances[index] = balanceResult
          if (toBigNumber(balanceResult.confirmedBalance).gt(highestBalance)) {
            indexToSend = index
            break
          }
        }
        if (indexToSend < 0) {
          const allAddresses = await Promise.all(indicesToTry.map(async i => (await payments.getPayport(i)).address))
          throw new Error(`Cannot end to end test sweeping due to lack of funds. Send testnet BTC to any of the following addresses and try again. ${JSON.stringify(allAddresses)}`)
        }
        const recipientIndex = indexToSend === indicesToTry[0] ? indicesToTry[1] : indicesToTry[0]
        const unsignedTx = await payments.createTransaction(indexToSend, recipientIndex, '0.0001')
        const signedTx = await payments.signTransaction(unsignedTx)
        logger.log(`Sending ${signedTx.amount} from ${indexToSend} to ${recipientIndex} in tx ${signedTx.id}`)
        expect(await payments.broadcastTransaction(signedTx)).toEqual({
          id: signedTx.id,
        })
        // const tx = await pollUntilEnded(signedTx)
        const tx = await payments.getTransactionInfo(signedTx.id)
        expect(tx.amount).toEqual(signedTx.amount)
        expect(tx.fee).toEqual(signedTx.fee)
      })
    })
  }
})
