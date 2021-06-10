import fs from 'fs'
import path from 'path'
import { FeeRateType, BalanceResult, TransactionStatus, NetworkType, FeeLevel } from '@faast/payments-common'
import { toBigNumber } from '@faast/ts-common'
import BigNumber from 'bignumber.js'
import { assertBitcoinishTxInfoEquality } from '@faast/bitcoin-payments/test/utils'

import {
  HdLitecoinPayments, LitecoinTransactionInfo, HdLitecoinPaymentsConfig,
  LitecoinSignedTransaction, SinglesigAddressType, AddressType,
} from '../src'

import { txInfo_4d111 } from './fixtures'
import fixtures from './fixtures/singlesigMainnet'
import { END_TRANSACTION_STATES, delay, expectEqualWhenTruthy, logger, expectEqualOmit } from './utils'

const EXTERNAL_ADDRESS = 'MCTwS16sNbKENcr7qs5drkZTtSfaJLw8tB'

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
    `File ${SECRET_XPRV_FILE} missing. Send and sweep e2e mainnet tests will be skipped. To enable them ask Dylan to share the file with you.`,
  )
}

const addressTypesToTest: SinglesigAddressType[] = [
  AddressType.Legacy,
  AddressType.SegwitP2SH,
  AddressType.SegwitNative,
]

const describeAll = !secretXprv ? describe.skip : describe

describeAll('e2e mainnet', () => {
  let testsComplete = false

  afterAll(() => {
    testsComplete = true
  })

  const paymentsConfig: HdLitecoinPaymentsConfig = {
    hdKey: secretXprv,
    network: NetworkType.Mainnet,
    addressType: AddressType.SegwitNative,
    logger,
    targetUtxoPoolSize: 1,
  }
  const payments = new HdLitecoinPayments(paymentsConfig)
  const feeRate = '12'
  const feeRateType = FeeRateType.BasePerWeight
  const address0 = 'ltc1q9ek9srkxa69l8p9qdk8v2ntzs9vetxnr6xhvf4'
  const address0balance = '0.05'
  const address3 = 'ltc1qazag0t8ag0u6qv0ha2wectsupte8v0nt9fgeet'
  const xpub =
    'xpub6CrMcKhbvSyc3ciFxZ4TYkdexCsKCA3hQVCYzn6UJHUA5GHkEzUt3w72kGrQGpXdwR4LHc5JGGoqEyq6FX3MD18oujhe4AAqXh6veaLF8XZ'
  const address0utxos = [
    {
      'txid': '81f182a2075b9c9d18b0ae1d268fd153a41db48bc36eb4ba473ecf4413367f04',
      'vout': 0,
      'value': '0.05',
      'satoshis': 5000000,
      'height': 613152,
      'confirmations': 8753,
      'scriptPubKeyHex': '00142e6c580ec6ee8bf384a06d8ec54d628159959a63',
      'txHex': '0200000000010130e01b319d140a4cb9ea681102d68895c1e940dce25807e223bc3587b525af570000000000fdffffff06404b4c00000000001600142e6c580ec6ee8bf384a06d8ec54d628159959a63eb74020000000000160014d9efcb28440dace960cc73bd95adec1fb453809ad7e9040000000000160014d9efcb28440dace960cc73bd95adec1fb453809aaed3090000000000160014d9efcb28440dace960cc73bd95adec1fb453809a5ca7130000000000160014d9efcb28440dace960cc73bd95adec1fb453809ab94e270000000000160014d9efcb28440dace960cc73bd95adec1fb453809a0247304402206c6e6c0a1d02040131be99869ea99276bb2385aea2342e0cff334fef762a785702207e0c3b112734506cf5d2d65c656d8a1f984c967e6506a7523aa076473c6c316d01210307af618c38460fd0d8526b1f285658db267e40c03939de07bccf4fdbbc9d609600000000',
      'coinbase': false,
      'address': 'ltc1q9ek9srkxa69l8p9qdk8v2ntzs9vetxnr6xhvf4',
      'spent': false,
    }
  ]
  const omitUtxoFieldEquality = ['height', 'confirmations', 'lockTime']

  it('get correct xpub', async () => {
    expect(payments.xpub).toEqual(xpub)
  })
  it('get correct address for index 0', async () => {
    expect(await payments.getPayport(0)).toEqual({ address: address0 })
  })
  it('get correct address for index 3', async () => {
    expect(await payments.getPayport(3)).toEqual({ address: address3 })
  })
  it('get correct balance for index 0', async () => {
    expect(await payments.getBalance(0)).toEqual({
      confirmedBalance: address0balance,
      unconfirmedBalance: '0',
      spendableBalance: address0balance,
      sweepable: true,
      requiresActivation: false,
    })
  })
  it('get correct balance for address 0', async () => {
    expect(await payments.getBalance({ address: address0 })).toEqual({
      confirmedBalance: address0balance,
      unconfirmedBalance: '0',
      spendableBalance: address0balance,
      sweepable: true,
      requiresActivation: false,
    })
  })
  it('get correct balance for address 3', async () => {
    expect(await payments.getBalance({ address: address3 })).toEqual({
      confirmedBalance: '0',
      unconfirmedBalance: '0',
      spendableBalance: '0',
      sweepable: false,
      requiresActivation: false,
    })
  })

  it('can get balance of unused address', async () => {
    expect(await payments.getBalance(12345678)).toEqual({
      confirmedBalance: '0',
      unconfirmedBalance: '0',
      spendableBalance: '0',
      sweepable: false,
      requiresActivation: false,
    })
  })

  it('get transaction by arbitrary hash', async () => {
    const tx = await payments.getTransactionInfo('4d111229fefb8b856beafa1a5e2799a16d2718f558e1c0ada0fde13fd41653a9')
    assertBitcoinishTxInfoEquality(tx, txInfo_4d111)
  })
  it('fail to get an invalid transaction hash', async () => {
    await expect(payments.getTransactionInfo('123456abcdef'))
      .rejects.toThrow("Transaction '123456abcdef' not found")
  })

  describe('getFeeRateRecommendation', () => {

    it('succeeds without token', async () => {
      const estimate = await payments.getFeeRateRecommendation(FeeLevel.High)
      expect(estimate.feeRateType).toBe(FeeRateType.BasePerWeight)
      expect(Number.parseFloat(estimate.feeRate)).toBeGreaterThan(1)
    })

    ;(process.env.BLOCKCYPHER_TOKEN ? it : it.skip)('succeeds with token', async () => {
      const paymentsWithToken = new HdLitecoinPayments({
        ...paymentsConfig,
        blockcypherToken: process.env.BLOCKCYPHER_TOKEN,
      })
      const estimate = await paymentsWithToken.getFeeRateRecommendation(FeeLevel.High)
      expect(estimate.feeRateType).toBe(FeeRateType.BasePerWeight)
      expect(Number.parseFloat(estimate.feeRate)).toBeGreaterThan(1)
    })

    it('throws on invalid token', async () => {
      const paymentsWithToken = new HdLitecoinPayments({
        ...paymentsConfig,
        blockcypherToken: 'invalid',
      })
      await expect(() => paymentsWithToken.getFeeRateRecommendation(FeeLevel.High))
        .rejects.toThrow('Failed to retrieve LTC mainnet fee rate from blockcypher')
    })

  })

  it('creates transaction with fixed fee', async () => {
    const fee = '0.00005'
    const tx = await payments.createSweepTransaction(0, 3, { feeRate: fee, feeRateType: FeeRateType.Main })
    expect(tx.fee).toBe(fee)
  })
  it('create sweep transaction to an index', async () => {
    const tx = await payments.createSweepTransaction(0, 3, { feeRate, feeRateType })
    expect(tx).toBeDefined()
    expect(toBigNumber(tx.amount).plus(tx.fee).toString()).toEqual(address0balance)
    expect(tx.fromAddress).toEqual(address0)
    expect(tx.toAddress).toEqual(address3)
    expect(tx.fromIndex).toEqual(0)
    expect(tx.toIndex).toEqual(3)
    expect(tx.inputUtxos).toBeTruthy()
  })
  it('create sweep transaction to an internal address', async () => {
    const tx = await payments.createSweepTransaction(0, { address: address3 }, { feeRate, feeRateType })
    expect(tx).toBeDefined()
    expect(toBigNumber(tx.amount).plus(tx.fee).toString()).toEqual(address0balance)
    expect(tx.fromAddress).toEqual(address0)
    expect(tx.toAddress).toEqual(address3)
    expect(tx.fromIndex).toEqual(0)
    expect(tx.toIndex).toEqual(null)
    expect(tx.inputUtxos).toBeTruthy()
  })
  it('create sweep transaction to an external address', async () => {
    const tx = await payments.createSweepTransaction(0, { address: EXTERNAL_ADDRESS }, { feeRate, feeRateType })
    expect(tx).toBeDefined()
    expect(toBigNumber(tx.amount).plus(tx.fee).toString()).toEqual(address0balance)
    expect(tx.fromAddress).toEqual(address0)
    expect(tx.toAddress).toEqual(EXTERNAL_ADDRESS)
    expect(tx.fromIndex).toEqual(0)
    expect(tx.toIndex).toEqual(null)
    expect(tx.inputUtxos).toBeTruthy()
  })
  it('create sweep transaction to an external address with unconfirmed utxos', async () => {
    const tx = await payments.createSweepTransaction(0, { address: EXTERNAL_ADDRESS }, {
      useUnconfirmedUtxos: true,
      availableUtxos: [{
        ...address0utxos[0],
        height: undefined,
        confirmations: undefined,
      }],
      feeRate,
      feeRateType,
    })
    expect(tx).toBeDefined()
    expect(toBigNumber(tx.amount).plus(tx.fee).toString()).toEqual(address0balance)
    expect(tx.fromAddress).toEqual(address0)
    expect(tx.toAddress).toEqual(EXTERNAL_ADDRESS)
    expect(tx.fromIndex).toEqual(0)
    expect(tx.toIndex).toEqual(null)
    expectEqualOmit(tx.inputUtxos, address0utxos, omitUtxoFieldEquality)
    expect(tx.data.changeOutputs!.length).toBe(0)
    const expectedTxSize = 110
    const expectedFee = new BigNumber(feeRate).times(expectedTxSize).times(1e-8).toString()
    expect(tx.fee).toBe(expectedFee)
  })

  it('create send transaction to an index', async () => {
    const amount = '0.00005'
    const tx = await payments.createTransaction(0, 3, amount, { feeRate, feeRateType })
    expect(tx).toBeDefined()
    expect(tx.amount).toEqual(amount)
    expect(tx.fromAddress).toEqual(address0)
    expect(tx.toAddress).toEqual(address3)
    expect(tx.fromIndex).toEqual(0)
    expect(tx.toIndex).toEqual(3)
    expectEqualOmit(tx.inputUtxos, address0utxos, omitUtxoFieldEquality)
    expect(tx.externalOutputs).toEqual([{ address: address3, value: amount }])
    expect(tx.data.changeOutputs!.length).toBe(1)
    const expectedTxSize = 140
    const expectedFee = new BigNumber(feeRate).times(expectedTxSize).times(1e-8).toString()
    expect(tx.fee).toBe(expectedFee)
    const expectedChange = new BigNumber(address0balance).minus(amount).minus(expectedFee).toString()
    expect(tx.data.changeOutputs).toEqual([{ address: address0, value: expectedChange }])
  })
  it('create send transaction to an internal address', async () => {
    const amount = '0.00005'
    const tx = await payments.createTransaction(0, { address: address3 }, amount, { feeRate, feeRateType })
    expect(tx).toBeDefined()
    expect(tx.amount).toEqual(amount)
    expect(tx.fromAddress).toEqual(address0)
    expect(tx.toAddress).toEqual(address3)
    expect(tx.fromIndex).toEqual(0)
    expect(tx.toIndex).toEqual(null)
    expect(tx.inputUtxos).toBeTruthy()
  })

  it('can sign transaction', async () => {
    const tx = await payments.createSweepTransaction(0, 3, { feeRate, feeRateType })
    expect(tx).toBeDefined()
    const signedTx = await payments.signTransaction(tx)
    expect(signedTx).toBeDefined()
    expect(signedTx.status).toBe(TransactionStatus.Signed)
    expect(signedTx.data.hex).toMatch(/^[a-f0-9]+$/)
    expect(signedTx.data.partial).toBe(false)
    expect(signedTx.data.unsignedTxHash).toMatch(/^[a-f0-9]+$/)
  })

  it('can sign transaction without rawHex', async () => {
    const tx = await payments.createSweepTransaction(0, 3, { feeRate, feeRateType })
    expect(tx).toBeDefined()
    tx.data.rawHex = undefined
    const signedTx = await payments.signTransaction(tx)
    expect(signedTx).toBeDefined()
    expect(signedTx.status).toBe(TransactionStatus.Signed)
    expect(signedTx.data.hex).toMatch(/^[a-f0-9]+$/)
    expect(signedTx.data.partial).toBe(false)
    expect(signedTx.data.unsignedTxHash).toMatch(/^[a-f0-9]+$/)
  })

  for (let addressType of addressTypesToTest) {
    const { xpub, addresses, sweepTxSize } = fixtures[addressType]

    describe(addressType, () => {
      const paymentsConfig: HdLitecoinPaymentsConfig = {
        hdKey: secretXprv,
        network: NetworkType.Mainnet,
        addressType,
        logger,
        minChange: '0.01',
        targetUtxoPoolSize: 5,
      }
      const payments = new HdLitecoinPayments(paymentsConfig)
      it('get correct xpub', async () => {
        expect(payments.xpub).toEqual(xpub)
      })
      for (let iStr in addresses) {
        const i = Number.parseInt(iStr)
        it(`get correct address for index ${i}`, async () => {
          expect(await payments.getPayport(i)).toEqual({ address: (addresses as any)[i] })
        })
      }

      async function pollUntilEnded(signedTx: LitecoinSignedTransaction) {
        const txId = signedTx.id
        logger.log('polling until ended', txId)
        let tx: LitecoinTransactionInfo | undefined
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
          throw new Error(`Cannot end to end test sweeping due to lack of funds. Send LTC to any of the following addresses and try again. ${JSON.stringify(allAddresses)}`)
        }
        const recipientIndex = indexToSweep === indicesToTry[0] ? indicesToTry[1] : indicesToTry[0]
        const satPerByte = 44
        const unsignedTx = await payments.createSweepTransaction(indexToSweep, recipientIndex, {
          feeRate: satPerByte.toString(),
          feeRateType: FeeRateType.BasePerWeight,
          useUnconfirmedUtxos: true, // Prevents consecutive tests from failing
        })
        const signedTx = await payments.signTransaction(unsignedTx)
        expect(signedTx.inputUtxos).toBeDefined()
        expect(signedTx.inputUtxos!.length).toBe(1)
        expect(signedTx.externalOutputs).toBeDefined()
        expect(signedTx.externalOutputs!.length).toBe(1)
        const feeNumber = new BigNumber(signedTx.fee).toNumber()
        expect(feeNumber).toBe((sweepTxSize*satPerByte)*1e-8)
        logger.log(`Sweeping ${signedTx.amount} from ${indexToSweep} to ${recipientIndex} in tx ${signedTx.id}`)
        expect(await payments.broadcastTransaction(signedTx)).toEqual({
          id: signedTx.id,
        })
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
          throw new Error(`Cannot end to end test sweeping due to lack of funds. Send LTC to any of the following addresses and try again. ${JSON.stringify(allAddresses)}`)
        }
        const recipientIndex = indexToSend === indicesToTry[0] ? indicesToTry[1] : indicesToTry[0]
        const unsignedTx = await payments.createTransaction(
          indexToSend,
          recipientIndex,
          '0.0005',
          {
            useUnconfirmedUtxos: true, // Prevents consecutive tests from failing
            maxFeePercent: 100,
            feeLevel: FeeLevel.Low,
          },
        )
        const signedTx = await payments.signTransaction(unsignedTx)
        logger.log(`Sending ${signedTx.amount} from ${indexToSend} to ${recipientIndex} in tx ${signedTx.id}`)
        expect(await payments.broadcastTransaction(signedTx)).toEqual({
          id: signedTx.id,
        })
        const tx = await payments.getTransactionInfo(signedTx.id)
        expect(tx.amount).toEqual(signedTx.amount)
        expect(tx.fee).toEqual(signedTx.fee)
      })
    })
  }
})
