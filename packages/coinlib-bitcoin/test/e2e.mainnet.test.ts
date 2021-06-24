import fs from 'fs'
import path from 'path'
import { FeeRateType, BalanceResult, TransactionStatus, NetworkType, FeeLevel, UtxoInfo } from '@bitaccess/coinlib-common'
import { toBigNumber } from '@faast/ts-common'
import BigNumber from 'bignumber.js'

import {
  HdBitcoinPayments, BitcoinTransactionInfo, HdBitcoinPaymentsConfig,
  BitcoinSignedTransaction, AddressType,
} from '../src'

import { txInfo_beae1 } from './fixtures/transactions'
import {
  END_TRANSACTION_STATES,
  delay,
  expectEqualWhenTruthy,
  logger,
  expectEqualOmit,
  assertBitcoinishTxInfoEquality,
} from './utils'

const EXTERNAL_ADDRESS = '14Z2k3tU19TSzBfT8s4QFAcYsbECUJnxiK'

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

const describeAll = !secretXprv ? describe.skip : describe

describeAll('e2e mainnet', () => {
  let testsComplete = false

  afterAll(() => {
    testsComplete = true
  })

  const paymentsConfig: HdBitcoinPaymentsConfig = {
    hdKey: secretXprv,
    network: NetworkType.Mainnet,
    addressType: AddressType.SegwitNative,
    logger,
    targetUtxoPoolSize: 5,
  }
  const payments = new HdBitcoinPayments(paymentsConfig)
  const feeRate = '12'
  const feeRateType = FeeRateType.BasePerWeight
  const address0 = 'bc1qz7v8smdfrgzqvjre3lrcxl4ul9x806e7umgf27'
  const address0balance = '0.00011'
  const address3 = 'bc1q2qsxsvwx2tmrfqqg8f58qgu9swn3zau809tzty'
  const xpub =
    'xpub6CMNrExwWj5nM3zYW8fXmZ1LrhrAuggZQAnBeWKiMQdK9tBWd1Ed6f2g94uJ4VwmX74uT6wzmFKqSvCGb3aoX33NQnoGPf7Bk8Yg9LM6VVH'
  const address0utxos: UtxoInfo[] = [
    {
      'txid': '34ce1e85a6a934bcb2f08f833835db008274c1b59f236edba2f87c0ce21bc10b',
      'vout': 0,
      'value': '0.00011',
      'satoshis': 11000,
      'height': '613152',
      'confirmations': 8753,
      'coinbase': false,
      'signer': 0,
      'spent': false,
      'address': 'bc1qz7v8smdfrgzqvjre3lrcxl4ul9x806e7umgf27',
      'scriptPubKeyHex': '00141798786da91a040648798fc7837ebcf94c77eb3e',
      'txHex': '02000000000101f871ced6c1e288f5e71ac7e5806b6520e7591ac940c551d5f058f64d958a7a380000000000ffffffff02f82a0000000000001600141798786da91a040648798fc7837ebcf94c77eb3e466002000000000016001453a82df79d3dd4226ae5d0c45cc6c01a2d13e652024730440220056048afa4db673faa7bf6b1f06951a1f7c736d86cb09986c8aeb21c42f4c3af02202f556189874bd25b17d01bd35e6dbdcc7a1f7725108c847e3f32b4d17f7561b3012102b1faf30d6ad23213e81b3b7e69e4c630bafe8d0acbb9a74e78ae84ae40dc786e00000000',
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
    const tx = await payments.getTransactionInfo('beae121a09459bd76995ee7de20f2dcd8f52abbbf513a32f24be572737b17ef3')
    assertBitcoinishTxInfoEquality(tx, txInfo_beae1)
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
      const paymentsWithToken = new HdBitcoinPayments({
        ...paymentsConfig,
        blockcypherToken: process.env.BLOCKCYPHER_TOKEN,
      })
      const estimate = await paymentsWithToken.getFeeRateRecommendation(FeeLevel.High)
      expect(estimate.feeRateType).toBe(FeeRateType.BasePerWeight)
      expect(Number.parseFloat(estimate.feeRate)).toBeGreaterThan(1)
    })

    it('throws on invalid token', async () => {
      const paymentsWithToken = new HdBitcoinPayments({
        ...paymentsConfig,
        blockcypherToken: 'invalid',
      })
      await expect(() => paymentsWithToken.getFeeRateRecommendation(FeeLevel.High))
        .rejects.toThrow('Failed to retrieve BTC mainnet fee rate from blockcypher')
    })

  })

  it('cannot create transaction with fee paid by sender when amount equals balance', async () => {
    const fee = '0.00002'
    const amount = address0balance
    await expect(payments.createTransaction(0, 3, amount, {
      feeRate: fee,
      feeRateType: FeeRateType.Main,
      recipientPaysFee: false,
    })).rejects.toThrow('PAYMENTS_TX_INSUFFICIENT_BALANCE')
  })

  it('cannot create transaction output below dust threshold', async () => {
    const fee = '0.00002'
    await expect(payments.createTransaction(0, 3, '0.00000001', {
      feeRate: fee,
      feeRateType: FeeRateType.Main,
    })).rejects.toThrow('below dust threshold')
  })

  it('cannot create send transaction when fee exceeds max percent', async () => {
    const fee = '0.00003'
    const amount = '0.00005'
    await expect(payments.createTransaction(0, 3, amount, {
      feeRate: fee,
      feeRateType: FeeRateType.Main,
      recipientPaysFee: false,
      maxFeePercent: 40
    })).rejects.toThrow('PAYMENTS_TX_FEE_TOO_HIGH')
  })

  it('cannot create send transaction when fee exceeds max percent and recipient pays fee', async () => {
    const fee = '0.00003'
    const amount = '0.00005'
    await expect(payments.createTransaction(0, 3, amount, {
      feeRate: fee,
      feeRateType: FeeRateType.Main,
      recipientPaysFee: true,
      maxFeePercent: 40
    })).rejects.toThrow('PAYMENTS_TX_FEE_TOO_HIGH')
  })

  it('can create send transaction when fee equals max percent', async () => {
    const fee = '0.00002'
    const amount = '0.00005'
    const tx = await payments.createTransaction(0, 3, amount, {
      feeRate: fee,
      feeRateType: FeeRateType.Main,
      recipientPaysFee: false,
      maxFeePercent: 40
    })
    expect(tx.fee).toBe(fee)
    expect(tx.amount).toBe(amount)
  })

  it('can create send transaction when fee equals max percent and recipient pays fee', async () => {
    const fee = '0.00002'
    const amount = '0.00005'
    const tx = await payments.createTransaction(0, 3, amount, {
      feeRate: fee,
      feeRateType: FeeRateType.Main,
      recipientPaysFee: true,
      maxFeePercent: 40
    })
    expect(tx.fee).toBe(fee)
    expect(tx.amount).toBe('0.00003')
  })

  it('creates ideal solution transaction with fee paid by sender', async () => {
    const targetUtxo = address0utxos[0]
    const fee = '0.00002'
    const amount = new BigNumber(targetUtxo.value).minus(fee).toString()
    const tx = await payments.createTransaction(0, 3, amount, {
      feeRate: fee,
      feeRateType: FeeRateType.Main,
      recipientPaysFee: false,
    })
    expect(tx.fee).toBe(fee)
    expect(tx.amount).toBe(amount)
    expectEqualOmit(tx.inputUtxos, [targetUtxo], omitUtxoFieldEquality)
  })

  it('creates ideal solution transaction with fee paid by recipient', async () => {
    const targetUtxo = address0utxos[0]
    const fee = '0.00002'
    const amount = targetUtxo.value
    const tx = await payments.createTransaction(0, 3, amount, {
      feeRate: fee,
      feeRateType: FeeRateType.Main,
      recipientPaysFee: true,
    })
    expect(tx.fee).toBe(fee)
    expect(tx.amount).toBe(new BigNumber(amount).minus(fee).toString())
    expectEqualOmit(tx.inputUtxos, [targetUtxo], omitUtxoFieldEquality)
  })

  it('creates transaction with fixed fee paid by sender', async () => {
    const fee = '0.00002'
    const amount = '0.00005'
    const tx = await payments.createTransaction(0, 3, amount, {
      feeRate: fee,
      feeRateType: FeeRateType.Main,
      recipientPaysFee: false,
    })
    expect(tx.fee).toBe(fee)
    expect(tx.amount).toBe(amount)
  })

  it('creates transaction with fixed fee paid by recipient', async () => {
    const fee = '0.00002'
    const amount = '0.00005'
    const tx = await payments.createTransaction(0, 3, amount, {
      feeRate: fee,
      feeRateType: FeeRateType.Main,
      recipientPaysFee: true,
    })
    expect(tx.fee).toBe(fee)
    expect(tx.amount).toBe('0.00003')
  })

  it('creates multi out transaction with fixed fee paid by recipient', async () => {
    const fee = '0.00002'
    const amount = '0.00005'
    const outputs = [{ payport: address3, amount }, { payport: address3, amount }]
    const tx = await payments.createMultiOutputTransaction(0, outputs, {
      feeRate: fee,
      feeRateType: FeeRateType.Main,
      recipientPaysFee: true,
    })
    expect(tx.fee).toBe(fee)
    expect(tx.amount).toBe('0.00008')
    expect(tx.externalOutputs).toEqual([
      {
        address: address3,
        value: '0.00004',
      },
      {
        address: address3,
        value: '0.00004',
      },
    ])
  })

  it('creates sweep transaction with fixed fee', async () => {
    const fee = '0.00005'
    const tx = await payments.createSweepTransaction(0, 3, { feeRate: fee, feeRateType: FeeRateType.Main })
    expect(tx.amount).toBe('0.00006')
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
    const expectedTxSize = 112
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
    const expectedTxSize = 171
    const expectedFee = new BigNumber(feeRate).times(expectedTxSize).times(1e-8).toString()
    expect(tx.fee).toBe(expectedFee)
    const expectedChange = new BigNumber(address0balance).minus(amount).minus(expectedFee)
    expect(tx.data.changeOutputs).toEqual([
      { address: address0, value: expectedChange.div(3).toString() },
      { address: address0, value: expectedChange.div(3).times(2).toString() },
    ])
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

  it('cannot sign invalid transaction', async () => {
    const maliciousTx = await payments.createSweepTransaction(0, 4, { feeRate, feeRateType })
    const tx = await payments.createSweepTransaction(0, 3, { feeRate, feeRateType })
    expect(tx).toBeDefined()
    tx.data.rawHex = maliciousTx.data.rawHex
    await expect(() => payments.signTransaction(tx)).rejects.toThrow('Invalid tx')
  })

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

  it.skip('end to end sweep', async () => {
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
      throw new Error(`Cannot end to end test sweeping due to lack of funds. Send mainnet BTC to any of the following addresses and try again. ${JSON.stringify(allAddresses)}`)
    }
    const recipientIndex = indexToSweep === indicesToTry[0] ? indicesToTry[1] : indicesToTry[0]
    try {
      const unsignedTx = await payments.createSweepTransaction(indexToSweep, recipientIndex, { feeRate, feeRateType })
      const signedTx = await payments.signTransaction(unsignedTx)
      logger.log(`Sweeping ${signedTx.amount} from ${indexToSweep} to ${recipientIndex} in tx ${signedTx.id}`)
      expect(await payments.broadcastTransaction(signedTx)).toEqual({
        id: signedTx.id,
      })
      const tx = await pollUntilEnded(signedTx)
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
