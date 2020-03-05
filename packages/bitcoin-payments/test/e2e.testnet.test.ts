import fs from 'fs'
import path from 'path'
import { BalanceResult, TransactionStatus, NetworkType } from '@faast/payments-common'

import {
  HdBitcoinPayments, BitcoinTransactionInfo,
  BitcoinSignedTransaction, AddressType,
} from '../src'

import { END_TRANSACTION_STATES, delay, expectEqualWhenTruthy, logger, expectEqualOmit } from './utils'
import { toBigNumber } from '@faast/ts-common'

const fixturesTestnet = {
  [AddressType.Legacy]: {
    xpub: 'tpubDCrzzVkDPs78zng37gt74vUce2hkxLrHTBdpFkSmYBAdn6sJ3y6KhipwqU1z6pNaSiRsvrZ7srFuEKV6cVVxms3nhQaD3sBtJegZXqHwYqz',
    addresses: {
      0: 'mu1khxE9EW9vFXJybnZtbfU9p4S1cmiEFi',
      5: 'mvTG97w8GMEt7h23NDe93oAyMr3wTMVwKS',
      6: 'mmEo6fYtR8MJvSiEPwEs5tQhArfXMqKgkq',
      7: 'n3TcPTNgyUQnLGi36nAZMcsLwpe2G9jZrn',
      8: 'mhqCdYjjtEV3QrnsntXKsNRmJicDMSmdQg',
    },
  },
  [AddressType.SegwitP2SH]: {
    xpub: 'tpubDCWCSpZSKfHb9B2ufCHBfDAVpr5S7K2XFKV53knzUrLmXuwi3HjTqkd1VGfSevwWRCDoYCuvVF3UkQAx53NQysVy3Tbd1vxTwKhHqDzJhws',
    addresses: {
      0: '2N9nHkMzaH6tm1oUDL6FvgwAKvMcKfa3AeY',
      5: '2MwHhRHoFNo8fMee6tFMafRQavFVnKgkm6v',
      6: '2NERxBtWd5BR5AH79ZVreAqroiTPoFzuZBA',
      7: '2NBfrpZpsEQmTFiivBJFA81CbqqiXBk5v6R',
      8: '2NFVvCdsMWjjsqJmXJ3wBPME6WzA8kvyFmj',
    },
  },
  [AddressType.SegwitNative]: {
    xpub: 'tpubDDCCjNA9Xw1Fpp3xAb3yjBBCui6wZ7idJxwcgj48Z7q3yTjEpay9cc2A1bjsr344ZTNGKv5j1djvU8bgzVTwoXaAXpX8cAEYVYG1Ch7fvVu',
    addresses: {
      0: 'tb1qq9y3rxsw0r8wl9907yg3uaq5qtyqdwrxw0hezn',
      5: 'tb1qma62jv65u4r5n5p6r3p2rmv44ae6purw3pej8f',
      6: 'tb1qxp967rdhl5422v0400vuv94525pqzf2f7e3j0g',
      7: 'tb1qmzcsklj78rltn22gqhu0yzzwfrdv97z3hs3ruu',
      8: 'tb1qaqz4hycamykjndvppru2p6j3j6gfnnft9ecf8q',
    },
  }
}

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

(!secretXprv ? describe.skip : describe)('e2e testnet', () => {
  let testsComplete = false

  afterAll(() => {
    testsComplete = true
  })

  for (let k in fixturesTestnet) {
    const addressType = k as AddressType
    const { xpub, addresses } = fixturesTestnet[addressType]

    describe(addressType, () => {
      const payments = new HdBitcoinPayments({
        hdKey: secretXprv,
        network: NetworkType.Testnet,
        addressType,
        logger,
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

      it.only('end to end sweep', async () => {
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
        try {
          const unsignedTx = await payments.createSweepTransaction(indexToSweep, recipientIndex)
          const signedTx = await payments.signTransaction(unsignedTx)
          logger.log(`Sweeping ${signedTx.amount} from ${indexToSweep} to ${recipientIndex} in tx ${signedTx.id}`)
          expect(await payments.broadcastTransaction(signedTx)).toEqual({
            id: signedTx.id,
          })
          // const tx = await pollUntilEnded(signedTx)
          const tx = await payments.getTransactionInfo(signedTx.id)
          expect(tx.amount).toEqual(signedTx.amount)
          expect(tx.fee).toEqual(signedTx.fee)
        } catch (e) {
          if ((e.message || (e as string)).includes('Validate TransferContract error, balance is not sufficient')) {
            logger.log('Ran consecutive tests too soon, previous sweep not complete. Wait a minute and retry')
          }
          throw e
        }
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
        try {
          const unsignedTx = await payments.createTransaction(indexToSend, recipientIndex, '0.0001')
          const signedTx = await payments.signTransaction(unsignedTx)
          logger.log(`Sweeping ${signedTx.amount} from ${indexToSend} to ${recipientIndex} in tx ${signedTx.id}`)
          expect(await payments.broadcastTransaction(signedTx)).toEqual({
            id: signedTx.id,
          })
          // const tx = await pollUntilEnded(signedTx)
          const tx = await payments.getTransactionInfo(signedTx.id)
          expect(tx.amount).toEqual(signedTx.amount)
          expect(tx.fee).toEqual(signedTx.fee)
        } catch (e) {
          if ((e.message || (e as string)).includes('balance is not sufficient')) {
            logger.log('Ran consecutive tests too soon, previous sweep not complete. Wait a minute and retry')
          }
          throw e
        }
      })
    })
  }
})
