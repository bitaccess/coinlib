import fs from 'fs'
import path from 'path'
import { FeeRateType, BalanceResult, TransactionStatus, NetworkType } from '@bitaccess/coinlib-common'
import {
  HdTronPayments,
  TronTransactionInfo,
  TronSignedTransaction,
} from '../src'
import { hdAccount } from './fixtures/accounts'
import { waitForExpiration, runHardcodedPublicKeyTests } from './helpers'
import { END_TRANSACTION_STATES, delay, expectEqualWhenTruthy, logger } from './utils'

const { XPRV, XPUB, PRIVATE_KEYS } = hdAccount

const EXTERNAL_ADDRESS = 'TW22XzVixyFZU5DxQJwxqXuKfNKFNMLqJ2'

const SECRET_XPRV_FILE = 'test/keys/mainnet.key'

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
    `File ${SECRET_XPRV_FILE} missing. Send and sweep tests will be skipped. To enable all tests ask Dylan to share the file with you on Lastpass.`,
  )
}


describe('HdTronPayments', () => {
  let testsComplete = false

  afterAll(() => {
    testsComplete = true
  })

  describe('static', () => {
    it('generateNewKeys should return xprv and xpub', async () => {
      const keys = HdTronPayments.generateNewKeys()
      expect(keys.xpub).toMatch(/^xpub\w{107}/)
      expect(keys.xprv).toMatch(/^xprv\w{107}/)
    })
    it('should throw on invalid hdKey', () => {
      expect(() => new HdTronPayments({ hdKey: 'invalid' })).toThrow()
    })
  })

  describe('hardcoded xpub', () => {
    const config = {
      hdKey: XPUB,
      network: NetworkType.Mainnet,
      logger,
    }
    const tp = new HdTronPayments(config)

    runHardcodedPublicKeyTests(tp, config)

    it('getPrivateKey throws', async () => {
      await expect(tp.getPrivateKey(1)).rejects.toThrow()
    })
  })

  describe('hardcoded xprv', () => {
    const config = {
      hdKey: XPRV,
      network: NetworkType.Mainnet,
      logger,
    }
    const tp = new HdTronPayments(config)

    runHardcodedPublicKeyTests(tp, config)

    it('getPrivateKey returns private key 1', async () => {
      expect(await tp.getPrivateKey(1)).toEqual(PRIVATE_KEYS[1])
    })
  })

  if (secretXprv) {
    describe('secret xprv', () => {
      const tp = new HdTronPayments({
        hdKey: secretXprv,
        network: NetworkType.Mainnet,
        logger,
      })
      const address0 = 'TGykLnoEQWYh6Mj6XWk9dWU5L6SXez2AWj'
      const address3 = 'TJGHeNADuV24au6bscVSfiynZmcpTMN8UK'
      const xpub =
        'xpub6CGU5e4rYticTKsvfMuqwDwTWfHefspTdgvkf9gcuVcvCxsCfBZnbRkhJw4CM5Vtcxefov4wteUT2Tr4LJZnJitqVVN9BekupBFupySNs5J'

      it('get correct xpub', async () => {
        expect(tp.getXpub()).toEqual(xpub)
      })
      it('get correct address for index 0', async () => {
        expect(await tp.getPayport(0)).toEqual({ address: address0 })
      })
      it('get correct address for index 3', async () => {
        expect(await tp.getPayport(3)).toEqual({ address: address3 })
      })
      it('get correct balance for index 0', async () => {
        expect(await tp.getBalance(0)).toEqual({
          confirmedBalance: '2.2',
          unconfirmedBalance: '0',
          spendableBalance: '2.1',
          sweepable: true,
          requiresActivation: false,
          minimumBalance: '0.1',
        })
      })
      it('get correct balance for address 0', async () => {
        expect(await tp.getBalance({ address: address0 })).toEqual({
          confirmedBalance: '2.2',
          unconfirmedBalance: '0',
          spendableBalance: '2.1',
          sweepable: true,
          requiresActivation: false,
          minimumBalance: '0.1',
        })
      })

      it('create transaction fails with custom fee', async () => {
        await expect(
          tp.createSweepTransaction(0, 3, { feeRate: '0.1', feeRateType: FeeRateType.Main }),
        ).rejects.toThrow('tron-payments custom fees are unsupported')
      })
      it.skip('create sweep transaction to an index', async () => {
        const tx = await tp.createSweepTransaction(0, 3)
        expect(tx).toBeDefined()
        expect(tx.amount).toEqual('2.1')
        expect(tx.fromAddress).toEqual(address0)
        expect(tx.toAddress).toEqual(address3)
        expect(tx.fromIndex).toEqual(0)
        expect(tx.toIndex).toEqual(3)
        await waitForExpiration(tx)
      })
      it.skip('create sweep transaction to an internal address', async () => {
        const tx = await tp.createSweepTransaction(0, { address: address3 })
        expect(tx).toBeDefined()
        expect(tx.amount).toEqual('2.1')
        expect(tx.fromAddress).toEqual(address0)
        expect(tx.toAddress).toEqual(address3)
        expect(tx.fromIndex).toEqual(0)
        expect(tx.toIndex).toEqual(null)
        await waitForExpiration(tx)
      })
      it('create sweep transaction to an external address', async () => {
        const tx = await tp.createSweepTransaction(0, { address: EXTERNAL_ADDRESS })
        expect(tx).toBeDefined()
        expect(tx.amount).toEqual('2.1')
        expect(tx.fromAddress).toEqual(address0)
        expect(tx.toAddress).toEqual(EXTERNAL_ADDRESS)
        expect(tx.fromIndex).toEqual(0)
        expect(tx.toIndex).toEqual(null)
        await waitForExpiration(tx)
      })

      it('create send transaction to an index', async () => {
        const amount = '0.5'
        const tx = await tp.createTransaction(0, 3, amount)
        expect(tx).toBeDefined()
        expect(tx.amount).toEqual(amount)
        expect(tx.fromAddress).toEqual(address0)
        expect(tx.toAddress).toEqual(address3)
        expect(tx.fromIndex).toEqual(0)
        expect(tx.toIndex).toEqual(3)
        await waitForExpiration(tx)
      })
      it('create send transaction to an internal address', async () => {
        const amount = '0.5'
        const tx = await tp.createTransaction(0, { address: address3 }, amount)
        expect(tx).toBeDefined()
        expect(tx.amount).toEqual(amount)
        expect(tx.fromAddress).toEqual(address0)
        expect(tx.toAddress).toEqual(address3)
        expect(tx.fromIndex).toEqual(0)
        expect(tx.toIndex).toEqual(null)
        await waitForExpiration(tx)
      })

      async function pollUntilEnded(signedTx: TronSignedTransaction) {
        const txId = signedTx.id
        logger.log('polling until ended', txId)
        let tx: TronTransactionInfo | undefined
        while (!testsComplete && (!tx || !END_TRANSACTION_STATES.includes(tx.status) || tx.confirmations === 0)) {
          try {
            tx = await tp.getTransactionInfo(txId)
          } catch (e) {
            if (e?.message?.includes('Transaction not found')) {
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
          const balanceResult = await tp.getBalance(index)
          balances[index] = balanceResult
          if (balanceResult.sweepable) {
            indexToSweep = index
            break
          }
        }
        if (indexToSweep < 0) {
          const allAddresses = await Promise.all(indicesToTry.map(i => tp.getPayport(i)))
          logger.log(
            'Cannot end to end test sweeping due to lack of funds. Send TRX to any of the following addresses and try again.',
            allAddresses,
          )
          return
        }
        const recipientIndex = indexToSweep === indicesToTry[0] ? indicesToTry[1] : indicesToTry[0]
        try {
          const unsignedTx = await tp.createSweepTransaction(indexToSweep, recipientIndex)
          const signedTx = await tp.signTransaction(unsignedTx)
          logger.log(`Sweeping ${signedTx.amount} TRX from ${indexToSweep} to ${recipientIndex} in tx ${signedTx.id}`)
          expect(await tp.broadcastTransaction(signedTx)).toEqual({
            id: signedTx.id,
            rebroadcast: false,
          })
          const tx = await pollUntilEnded(signedTx)
          expect(tx.amount).toEqual(signedTx.amount)
          expect(tx.fee).toEqual(signedTx.fee)
        } catch (e) {
          if ((e?.message || (e as string)).includes('Validate TransferContract error, balance is not sufficient')) {
            logger.log('Ran consecutive tests too soon, previous sweep not complete. Wait a minute and retry')
          }
          throw e
        }
      })
    })
  }
})
