import fs from 'fs'
import path from 'path'
import { omit } from 'lodash'
import { FeeRateType, BalanceResult, TransactionStatus, NetworkType } from '@faast/payments-common'

import {
  HdDogePayments, DogeTransactionInfo, HdDogePaymentsConfig,
  DogeSignedTransaction, AddressType,
  SinglesigAddressType
} from '../src'

import { txInfo_beae1 } from './fixtures/transactions'
import { legacyAccount } from './fixtures/accounts'
import { ADDRESS_INPUT_WEIGHTS } from '../src/utils'
import { END_TRANSACTION_STATES, delay, expectEqualWhenTruthy, logger, expectEqualOmit } from './utils'
import { toBigNumber } from '@faast/ts-common'
import BigNumber from 'bignumber.js'

const EXTERNAL_ADDRESS = 'DB15Lt7u8hxkbT8s1JAKHA9Xbxr8SbxnC8'

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
];

function assertTxInfo(actual: DogeTransactionInfo, expected: DogeTransactionInfo): void {
  expectEqualOmit({
    ...actual,
    data: {
      ...actual.data,
      vout: (actual.data as any).vout.map((o: any) => omit(o, ['spent'])),
    },
  }, expected, ['data.confirmations', 'confirmations'])
}

const describeAll = !secretXprv ? describe : describe

describeAll('e2e mainnet', () => {
  let testsComplete = false

  afterAll(() => {
    testsComplete = true
  })

  async function pollUntilEnded(signedTx: DogeSignedTransaction) {
    const txId = signedTx.id
    logger.log('polling until ended', txId)
    let tx: DogeTransactionInfo | undefined
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

  const payments = new HdDogePayments({
    hdKey: secretXprv,
    network: NetworkType.Mainnet,
    addressType: AddressType.Legacy,
    logger,
    targetUtxoPoolSize: 1,
  })
  const feeRate = '21'
  const feeRateType = FeeRateType.BasePerWeight
  const address10 = 'DC2uUxHtZdSAQ67WgZ7rMw1rKFAheKBu7F'
  const address10balance = '1400'
  const address3 = 'DEMZaqHw98CDiNuTsFFFUQfV4YiXRwxXh7'
  const xpub =
    'xpub6CHVE7XJJHooX3pFQSxi733aXzjeLgbVMimR3kvTfYx1cPtBmEaJT6bn3CJDhdysxbYes8yH1yNEX8dJxSTBxgBD6GUmsGrzGmsAKEax96X'
  const address10utxos = [
    {
      'txid': 'c505f76e7f49cc6f42570c27553a8adb826ad78baf0e86ee54c3934db4e7f34f',
      'vout': 0,
      'value': '1400',
      'satoshis': 140000000000,
      'height': 613152,
      'confirmations': 8753
    }
  ]
  const omitUtxoFieldEquality = ['height', 'confirmations', 'lockTime']

  it('get correct xpub', async () => {
    expect(payments.xpub).toEqual(xpub)
  })
  it('get correct address for index 10', async () => {
    expect(await payments.getPayport(10)).toEqual({ address: address10 })
  })
  it('get correct address for index 3', async () => {
    expect(await payments.getPayport(3)).toEqual({ address: address3 })
  })
  it('get correct balance for index 10', async () => {
    expect(await payments.getBalance(10)).toEqual({
      confirmedBalance: address10balance,
      unconfirmedBalance: '0',
      spendableBalance: address10balance,
      sweepable: true,
      requiresActivation: false,
    })
  })
  it('get correct balance for address 10', async () => {
    expect(await payments.getBalance({ address: address10 })).toEqual({
      confirmedBalance: address10balance,
      unconfirmedBalance: '0',
      spendableBalance: address10balance,
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
    const tx = await payments.getTransactionInfo('dc8ae0ebe273faf3e6e2f1192279df91fa6b8621e3daba08dc89ef9cb0539193')
    process.stderr.write(JSON.stringify(tx, null, 2))
    assertTxInfo(tx, txInfo_beae1)
  })
  it('fail to get an invalid transaction hash', async () => {
    await expect(payments.getTransactionInfo('123456abcdef'))
      .rejects.toThrow("Transaction '123456abcdef' not found")
  })

  it('creates transaction with fixed fee', async () => {
    const fee = '0.00005'
    const tx = await payments.createSweepTransaction(10, 3, { feeRate: fee, feeRateType: FeeRateType.Main })
    expect(tx.fee).toBe(fee)
  })
  it('create sweep transaction to an index', async () => {
    const tx = await payments.createSweepTransaction(10, 3, { feeRate, feeRateType })
    expect(tx).toBeDefined()
    expect(toBigNumber(tx.amount).plus(tx.fee).toString()).toEqual(address10balance)
    expect(tx.fromAddress).toEqual(address10)
    expect(tx.toAddress).toEqual(address3)
    expect(tx.fromIndex).toEqual(10)
    expect(tx.toIndex).toEqual(3)
    expect(tx.inputUtxos).toBeTruthy()
  })
  it('create sweep transaction to an internal address', async () => {
    const tx = await payments.createSweepTransaction(10, { address: address3 }, { feeRate, feeRateType })
    expect(tx).toBeDefined()
    expect(toBigNumber(tx.amount).plus(tx.fee).toString()).toEqual(address10balance)
    expect(tx.fromAddress).toEqual(address10)
    expect(tx.toAddress).toEqual(address3)
    expect(tx.fromIndex).toEqual(10)
    expect(tx.toIndex).toEqual(null)
    expect(tx.inputUtxos).toBeTruthy()
  })
  it('create sweep transaction to an external address', async () => {
    const tx = await payments.createSweepTransaction(10, { address: EXTERNAL_ADDRESS }, { feeRate, feeRateType })
    expect(tx).toBeDefined()
    expect(toBigNumber(tx.amount).plus(tx.fee).toString()).toEqual(address10balance)
    expect(tx.fromAddress).toEqual(address10)
    expect(tx.toAddress).toEqual(EXTERNAL_ADDRESS)
    expect(tx.fromIndex).toEqual(10)
    expect(tx.toIndex).toEqual(null)
    expect(tx.inputUtxos).toBeTruthy()
  })

  it('create sweep transaction to an external address with unconfirmed utxos', async () => {
    const feeRate = '21'
    const tx = await payments.createSweepTransaction(10, { address: EXTERNAL_ADDRESS }, {
      useUnconfirmedUtxos: true,
      utxos: [{
        ...address10utxos[0],
        height: undefined,
        confirmations: undefined,
      }],
      feeRate,
      feeRateType,
    })
    expect(tx).toBeDefined()
    expect(toBigNumber(tx.amount).plus(tx.fee).toString()).toEqual(address10balance)
    expect(tx.fromAddress).toEqual(address10)
    expect(tx.toAddress).toEqual(EXTERNAL_ADDRESS)
    expect(tx.fromIndex).toEqual(10)
    expect(tx.toIndex).toEqual(null)
    expectEqualOmit(tx.inputUtxos, address10utxos, omitUtxoFieldEquality)
    const expectedTxSize = 192
    const expectedFee = new BigNumber(feeRate).times(expectedTxSize).times(1e-8).toString()
    expect(tx.fee).toBe(expectedFee)
  })

  it('create send transaction to an index', async () => {
    const amount = '300'
    const feeRate = '21'
    const tx = await payments.createTransaction(10, 3, amount, { feeRate, feeRateType })
    expect(tx).toBeDefined()
    expect(tx.amount).toEqual(amount)
    expect(tx.fromAddress).toEqual(address10)
    expect(tx.toAddress).toEqual(address3)
    expect(tx.fromIndex).toEqual(10)
    expect(tx.toIndex).toEqual(3)
    expectEqualOmit(tx.inputUtxos, address10utxos, omitUtxoFieldEquality)
    expect(tx.externalOutputs).toEqual([{ address: address3, value: amount }])
    const expectedTxSize = 226
    const expectedFee = new BigNumber(feeRate).times(expectedTxSize).times(1e-8).toString()
    expect(tx.fee).toBe(expectedFee)
    const expectedChange = new BigNumber(address10balance).minus(amount).minus(expectedFee).toString()
    expect(tx.data.changeOutputs).toEqual([{ address: address10, value: expectedChange }])
  })
  it('create send transaction to an internal address', async () => {
    const amount = '300'
    const tx = await payments.createTransaction(10, { address: address3 }, amount, { feeRate, feeRateType })
    expect(tx).toBeDefined()
    expect(tx.amount).toEqual(amount)
    expect(tx.fromAddress).toEqual(address10)
    expect(tx.toAddress).toEqual(address3)
    expect(tx.fromIndex).toEqual(10)
    expect(tx.toIndex).toEqual(null)
    expect(tx.inputUtxos).toBeTruthy()
  })

  it('can sign transaction', async () => {
    const tx = await payments.createSweepTransaction(10, 3, { feeRate, feeRateType })
    expect(tx).toBeDefined()
    const signedTx = await payments.signTransaction(tx)
    expect(signedTx).toBeDefined()
    expect(signedTx.status).toBe(TransactionStatus.Signed)
    expect(signedTx.data.hex).toMatch(/^[a-f0-9]+$/)
    expect(signedTx.data.partial).toBe(false)
    expect(signedTx.data.unsignedTxHash).toMatch(/^[a-f0-9]+$/)
  })

  it('can sign transaction without rawHex', async () => {
    const tx = await payments.createSweepTransaction(10, 3, { feeRate, feeRateType })
    expect(tx).toBeDefined()
    tx.data.rawHex = undefined
    const signedTx = await payments.signTransaction(tx)
    expect(signedTx).toBeDefined()
    expect(signedTx.status).toBe(TransactionStatus.Signed)
    expect(signedTx.data.hex).toMatch(/^[a-f0-9]+$/)
    expect(signedTx.data.partial).toBe(false)
    expect(signedTx.data.unsignedTxHash).toMatch(/^[a-f0-9]+$/)
  })

  jest.setTimeout(300 * 1000)
  
  describe('getTransactionInfo', () => {
    const paymentsConfig: HdDogePaymentsConfig = {
      hdKey: secretXprv,
      network: NetworkType.Mainnet,
      addressType: AddressType.Legacy,
      logger,
    }
    const payments = new HdDogePayments(paymentsConfig)

    it('get multi output send', async () => {
      const tx = await payments.getTransactionInfo('4e0e95bdf18187d85c1ae76beb092e08e42fb3c54673f00e9b74bb110091e3b1')
      expect(tx.amount).toBe('31093.42440218')
      expect(tx.externalOutputs).toEqual([
        {
          address: 'DUFkcSFAmzou5dUrr7QTBsRhfeAEc1r46d',
          value: '30493.42440218',
        },
        {
          address: 'DQC35AaSvGBVLHXiAeujsXVRbGiE99ZL52',
          value: '600',
        },
      ])
      expect(tx.inputUtxos).toEqual([{
        txid: '47c5eb2473f5fdb119b5c7cc806efeaa4a3916a93a9753b51940aaa66c5a3eb3',
        vout: 0,
        value: '31097.94440218'
      }])
    })
  })

  for (let addressType of addressTypesToTest) {
    const { xpub, addresses, sweepTxSize } = legacyAccount

    describe(addressType, () => {
      const paymentsConfig: HdDogePaymentsConfig = {
        hdKey: secretXprv,
        network: NetworkType.Mainnet,
        addressType,
        logger,
        minChange: '0.01',
        targetUtxoPoolSize: 5,
      }
      const payments = new HdDogePayments(paymentsConfig)
      it('get correct xpub', async () => {
        expect(payments.xpub).toEqual(xpub)
      })
      for (let iStr in addresses) {
        const i = Number.parseInt(iStr)
        it(`get correct address for index ${i}`, async () => {
          expect(await payments.getPayport(i)).toEqual({ address: (addresses as any)[i] })
        })
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
          throw new Error(`Cannot end to end test sweeping due to lack of funds. Send DOGE to any of the following addresses and try again. ${JSON.stringify(allAddresses)}`)
        }
        const recipientIndex = indexToSweep === indicesToTry[0] ? indicesToTry[1] : indicesToTry[0]
        const satPerByte = 21 * 30000 * 4
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
          expectedTxSize += (extraInputs * ADDRESS_INPUT_WEIGHTS[addressType]) / 4
        }

        expect(feeNumber).toBe((expectedTxSize*satPerByte)*1e-8)
        console.log('sweep fee', signedTx.fee)
        logger.log(`Sweeping ${signedTx.amount} from ${indexToSweep} to ${recipientIndex} in tx ${signedTx.id}`)
        // expect(await payments.broadcastTransaction(signedTx)).toEqual({
        //   id: signedTx.id,
        // })
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
          throw new Error(`Cannot end to end test sweeping due to lack of funds. Send DOGE to any of the following addresses and try again. ${JSON.stringify(allAddresses)}`)
        }
        const recipientIndex = indexToSend === indicesToTry[0] ? indicesToTry[1] : indicesToTry[0]
        const unsignedTx = await payments.createTransaction(
          indexToSend,
          recipientIndex,
          '300',
          { useUnconfirmedUtxos: true }, // Prevents consecutive tests from failing
        )
        const signedTx = await payments.signTransaction(unsignedTx)
        console.log('feee', signedTx.fee)
        logger.log(`Sending ${signedTx.amount} from ${indexToSend} to ${recipientIndex} in tx ${signedTx.id}`)
        // expect(await payments.broadcastTransaction(signedTx)).toEqual({
        //   id: signedTx.id,
        // })
        const tx = await payments.getTransactionInfo(signedTx.id)
        expect(tx.amount).toEqual(signedTx.amount)
        expect(tx.fee).toEqual(signedTx.fee)
      })
    })
  }
})
