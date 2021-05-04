import { BalanceActivity } from './../../payments-common/src/types';
import fs from 'fs'
import path from 'path'
import { BalanceResult, TransactionStatus, NetworkType, FeeRateType, FeeLevel } from '@faast/payments-common'

import {
  HdBitcoinPayments, BitcoinTransactionInfo,
  BitcoinSignedTransaction, AddressType, SinglesigAddressType,
  bitcoinish, BitcoinBalanceMonitor,
} from '../src'

import { END_TRANSACTION_STATES, delay, expectEqualWhenTruthy, logger } from './utils'
import { toBigNumber } from '@faast/ts-common'
import fixtures from './fixtures/singlesigTestnet'
import { HdBitcoinPaymentsConfig } from '../src/types'
import BigNumber from 'bignumber.js'
import { NormalizedTxBitcoin } from 'blockbook-client';

const SECRET_XPRV_FILE = 'test/keys/testnet.key'

const SWEEP_INDICES = [5, 6]
const SEND_INDICES = [7, 8]

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

  describe('getTransactionInfo', () => {
    const paymentsConfig: HdBitcoinPaymentsConfig = {
      hdKey: secretXprv,
      network: NetworkType.Testnet,
      addressType: AddressType.SegwitNative,
      logger,
    }
    const payments = new HdBitcoinPayments(paymentsConfig)

    it('get multi output send', async () => {
      const tx = await payments.getTransactionInfo('6b1fe4742fcf451b1db0723e10ec3b23f2cf87c3fbe6995d4159ef8ee6686d40')
      expect(tx.amount).toBe('0.06')
      expect(tx.externalOutputs).toEqual([
        {
          address: '2MzYfa3M3XECriE5TBzGyStWNZ9K79ZnCvL',
          value: '0.03',
        },
        {
          address: '2MuhoQzdBdNUYoyNxtbeSMUZdfmm6SvYBW8',
          value: '0.03',
        },
      ])
      expect(tx.inputUtxos).toEqual([{
        txid: 'd9671e060bfb9e32c39116bcb3087884293c444c7f657a57ef532e5c9c20ec87',
        vout: 1,
        value: '0.12666496'
      }])
    })
  })

  for (let addressType of addressTypesToTest) {
    const { xpub, addresses, sweepTxSize } = fixtures[addressType]

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
      const balanceMonitor = new BitcoinBalanceMonitor({
        network: NetworkType.Testnet,
        logger,
      })
      const recordedBalanceActivities: Array<[BalanceActivity, NormalizedTxBitcoin]> = []
      let addressesToWatch: string[] = []
      let startBlockHeight: number
      beforeAll(async () => {
        balanceMonitor.init()
        addressesToWatch = [...SWEEP_INDICES, ...SEND_INDICES].map((i) => payments.getAddress(i))
        balanceMonitor.subscribeAddresses(addressesToWatch)
        balanceMonitor.onBalanceActivity((ba, rawTx) => {
          recordedBalanceActivities.push([ba, rawTx])
        })
        startBlockHeight = (await payments.getBlock()).height
      })

      it('get correct xpub', async () => {
        expect(payments.xpub).toEqual(xpub)
      })
      for (let iStr in addresses) {
        const i = Number.parseInt(iStr)
        it(`get correct address for index ${i}`, async () => {
          expect(await payments.getPayport(i)).toEqual({ address: (addresses as any)[i] })
        })
      }

      async function pollUntilFound(signedTx: BitcoinSignedTransaction) {
        const txId = signedTx.id
        const endState = [...END_TRANSACTION_STATES, TransactionStatus.Pending]
        logger.log(`polling until status ${endState.join('|')}`, txId)
        let tx: BitcoinTransactionInfo | undefined
        while (!testsComplete && (!tx || !endState.includes(tx.status))) {
          try {
            tx = await payments.getTransactionInfo(txId)
          } catch (e) {
            if (e.message.includes('not found')) {
              logger.log('tx not found yet', txId, e.message)
            } else {
              throw e
            }
          }
          await delay(5000)
        }
        if (!tx) {
          throw new Error(`failed to poll until found ${txId}`)
        }
        logger.log(tx.status, tx)
        expect(tx.id).toBe(signedTx.id)
        expect(tx.fromAddress).toBe(signedTx.fromAddress)
        expectEqualWhenTruthy(tx.fromExtraId, signedTx.fromExtraId)
        expect(tx.toAddress).toBe(signedTx.toAddress)
        expectEqualWhenTruthy(tx.toExtraId, signedTx.toExtraId)
        expect(tx.data).toBeDefined()
        expect(endState).toContain(tx.status)
        return tx
      }

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
        const satPerByte = 22
        const unsignedTx = await payments.createSweepTransaction(indexToSweep, recipientIndex, {
          feeRate: satPerByte.toString(),
          feeRateType: FeeRateType.BasePerWeight,
          useUnconfirmedUtxos: true, // Prevents consecutive tests from failing
        })
        const signedTx = await payments.signTransaction(unsignedTx)
        expect(signedTx.inputUtxos).toBeDefined()
        const inputCount = signedTx.inputUtxos!.length
        expect(inputCount).toBeGreaterThanOrEqual(1)
        expect(signedTx.externalOutputs).toBeDefined()
        expect(signedTx.externalOutputs!.length).toBe(1)
        const feeNumber = new BigNumber(signedTx.fee).toNumber()

        const extraInputs = inputCount - 1
        let expectedTxSize = sweepTxSize
        if (extraInputs) {
          expectedTxSize += (extraInputs * bitcoinish.ADDRESS_INPUT_WEIGHTS[addressType]) / 4
        }

        expect(feeNumber).toBe((expectedTxSize*satPerByte)*1e-8)
        logger.log(`Sweeping ${signedTx.amount} from ${indexToSweep} to ${recipientIndex} in tx ${signedTx.id}`)
        expect(await payments.broadcastTransaction(signedTx)).toEqual({
          id: signedTx.id,
        })
        const tx = await pollUntilFound(signedTx)
        expect(tx.amount).toEqual(signedTx.amount)
        expect(tx.fee).toEqual(signedTx.fee)
      }, 5 * 60 * 1000)

      it('end to end send', async () => {
        const indicesToTry = [7, 8]
        const balances: { [i: number]: BalanceResult } = {}
        let indexToSend: number = -1
        let highestBalance = toBigNumber(0)
        for (const index of indicesToTry) {
          const balanceResult = await payments.getBalance(index)
          balances[index] = balanceResult
          if (toBigNumber(balanceResult.spendableBalance).gt(highestBalance)) {
            indexToSend = index
            highestBalance = new BigNumber(balanceResult.spendableBalance)
          }
        }
        if (indexToSend < 0) {
          const allAddresses = await Promise.all(indicesToTry.map(async i => (await payments.getPayport(i)).address))
          throw new Error(`Cannot end to end test sweeping due to lack of funds. Send testnet BTC to any of the following addresses and try again. ${JSON.stringify(allAddresses)}`)
        }
        const recipientIndex = indexToSend === indicesToTry[0] ? indicesToTry[1] : indicesToTry[0]
        const unsignedTx = await payments.createTransaction(
          indexToSend,
          recipientIndex,
          '0.0001',
          {
            useUnconfirmedUtxos: true, // Prevents consecutive tests from failing
            feeRate: '10',
            feeRateType: FeeRateType.BasePerWeight,
          },
        )
        const signedTx = await payments.signTransaction(unsignedTx)
        logger.log(`Sending ${signedTx.amount} from ${indexToSend} to ${recipientIndex} in tx ${signedTx.id}`)
        expect(await payments.broadcastTransaction(signedTx)).toEqual({
          id: signedTx.id,
        })
        const tx = await pollUntilFound(signedTx)
        expect(tx.amount).toEqual(signedTx.amount)
        expect(tx.fee).toEqual(signedTx.fee)
      }, 5 * 60 * 1000)

      it('recorded all balance activities', async () => {
        expect(recordedBalanceActivities).toBe([])
      })

      it('can retrieve past activities', async () => {
        const pastActivities: Array<[BalanceActivity, NormalizedTxBitcoin]> = []
        addressesToWatch.forEach((a) => {
          balanceMonitor.retrieveBalanceActivities(a, (ba, rawTx) => {
            pastActivities.push([ba, rawTx])
          })
        })
        expect(pastActivities).toBe(recordedBalanceActivities)
      })
    })
  }
})
