import fs from 'fs'
import path from 'path'
import {
  FeeRateType,
  BalanceResult,
  TransactionStatus,
  NetworkType,
  FeeLevel,
  UtxoInfo,
  BigNumber,
} from '@bitaccess/coinlib-common'
import { bitcoinish } from '@bitaccess/coinlib-bitcoin'
import { toBigNumber } from '@faast/ts-common'
import { assertBitcoinishTxInfoEquality, getFromTo } from '@bitaccess/coinlib-bitcoin/test/utils'

import {
  HdBitcoinCashPayments,
  HdBitcoinCashPaymentsConfig,
} from '../src'

import { txInfo_beae1 } from './fixtures/transactions'
import { hdAccount } from './fixtures/accounts'
import { logger, expectEqualOmit } from './utils'
import { omit } from 'lodash'

const EXTERNAL_ADDRESS = 'bitcoincash:qqq50km70cjgpla3tnkt8nxgdt09wp0m7y9ctca8f6'

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
  const payments = new HdBitcoinCashPayments({
    hdKey: secretXprv,
    network: NetworkType.Mainnet,
    logger,
    targetUtxoPoolSize: 1,
  })
  const feeRate = '21'
  const feeRateType = FeeRateType.BasePerWeight
  const address0 = 'bitcoincash:qqyqaklgadws70sc3wa6rrrk2wlpt6tnjuvyll86mu'
  const address0balance = '0.03'
  const address3 = 'bitcoincash:qzya7xe4kc3ukll3mtk5lx49q3z3hnammgxvnedkzt'
  const xpub =
    'xpub6DPwXAhSxJbqowWSvozSDrQmHYLAZucdAnxmdGV2YdHHfaS9Kj4ZCET6eMGBwhFX2hYwqcHBeYdjsNiQ4o9KULqbX8mjnNbmC31LesCBF9R'
  const address0utxos: UtxoInfo[] = [
    {
      txid: 'e7ce2764359de9a624e538a26ef874ff3155dc1d7ec2088df1d26e259ea14ee7',
      vout: 0,
      value: '0.03',
      satoshis: 3000000,
      height: '613152',
      confirmations: 8753,
      txHex:
        '0100000001950708260ee1b332b1b2aa1687e99ac50d57b98000952e148e87d2b8a03de5dd000000006b4830450221009360e33ad04cdad31d2fa6190fea734db4a5710e1ef1201a21dd5225bf022c5b02204e4193aa847530187ce2085f0599cdeab7de607c96b6bb819c66a31028aa07e2412102bde4216a684b8bc73c8a6666398fb321b921407f0f3cdbf19f1abb01fcd1b983ffffffff02c0c62d00000000001976a914080edbe8eb5d0f3e188bbba18c7653be15e9739788ac97915000000000001976a9147fe0e88cb9f3a6248be40f291ae2a395d16703b388ac00000000',
      scriptPubKeyHex: '76a914080edbe8eb5d0f3e188bbba18c7653be15e9739788ac',
      coinbase: false,
      lockTime: undefined,
      spent: false,
      signer: 0,
      address: 'bitcoincash:qqyqaklgadws70sc3wa6rrrk2wlpt6tnjuvyll86mu',
    },
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
    const tx = await payments.getTransactionInfo('036cbcbcfa286c1ea3a8c1846064974a107d3f2a982b0ee29f5e02bbedb01f15')
    assertBitcoinishTxInfoEquality(tx, txInfo_beae1)
  })
  it('fail to get an invalid transaction hash', async () => {
    await expect(payments.getTransactionInfo('123456abcdef')).rejects.toThrow("Transaction '123456abcdef' not found")
  })

  it('creates transaction with fixed fee', async () => {
    const fee = '0.00005'
    const tx = await payments.createSweepTransaction(0, 3, { feeRate: fee, feeRateType: FeeRateType.Main })
    expect(tx.fee).toBe(fee)
  })
  it('create sweep transaction to an index', async () => {
    const tx = await payments.createSweepTransaction(0, 3, { feeRate, feeRateType })
    expect(tx).toBeDefined()
    expect(
      toBigNumber(tx.amount)
        .plus(tx.fee)
        .toString(),
    ).toEqual(address0balance)
    expect(tx.fromAddress).toEqual(address0)
    expect(tx.toAddress).toEqual(address3)
    expect(tx.fromIndex).toEqual(0)
    expect(tx.toIndex).toEqual(3)
    expect(tx.inputUtxos).toBeTruthy()
    expect(tx.data.rawHash).toEqual('46d4e8b57ec456ffdc5409767536d93f6b0218c060736e2db13b7d8f48e469fb')
  })
  it('create sweep transaction to an internal address', async () => {
    const tx = await payments.createSweepTransaction(0, { address: address3 }, { feeRate, feeRateType })
    expect(tx).toBeDefined()
    expect(
      toBigNumber(tx.amount)
        .plus(tx.fee)
        .toString(),
    ).toEqual(address0balance)
    expect(tx.fromAddress).toEqual(address0)
    expect(tx.toAddress).toEqual(address3)
    expect(tx.fromIndex).toEqual(0)
    expect(tx.toIndex).toEqual(null)
    expect(tx.inputUtxos).toBeTruthy()
  })
  it('create sweep transaction to an external address', async () => {
    const tx = await payments.createSweepTransaction(0, { address: EXTERNAL_ADDRESS }, { feeRate, feeRateType })
    expect(tx).toBeDefined()
    expect(
      toBigNumber(tx.amount)
        .plus(tx.fee)
        .toString(),
    ).toEqual(address0balance)
    expect(tx.fromAddress).toEqual(address0)
    expect(tx.toAddress).toEqual(EXTERNAL_ADDRESS)
    expect(tx.fromIndex).toEqual(0)
    expect(tx.toIndex).toEqual(null)
    expect(tx.inputUtxos).toBeTruthy()
  })

  it('create sweep transaction to an external address with unconfirmed utxos', async () => {
    const feeRate = '21'
    const tx = await payments.createSweepTransaction(
      0,
      { address: EXTERNAL_ADDRESS },
      {
        useUnconfirmedUtxos: true,
        availableUtxos: [
          {
            ...address0utxos[0],
            height: undefined,
            confirmations: undefined,
          },
        ],
        feeRate,
        feeRateType,
      },
    )
    expect(tx).toBeDefined()
    expect(
      toBigNumber(tx.amount)
        .plus(tx.fee)
        .toString(),
    ).toEqual(address0balance)
    expect(tx.fromAddress).toEqual(address0)
    expect(tx.toAddress).toEqual(EXTERNAL_ADDRESS)
    expect(tx.fromIndex).toEqual(0)
    expect(tx.toIndex).toEqual(null)
    expectEqualOmit(tx.inputUtxos, address0utxos, omitUtxoFieldEquality)
    const expectedTxSize = 192
    const expectedFee = new BigNumber(feeRate)
      .times(expectedTxSize)
      .times(1e-8)
      .toString()
    expect(tx.fee).toBe(expectedFee)
  })

  it('create send transaction to an index', async () => {
    const amount = '0.01'
    const feeRate = '21'
    const tx = await payments.createTransaction(0, 3, amount, { feeRate, feeRateType })
    expect(tx).toBeDefined()
    expect(tx.amount).toEqual(amount)
    expect(tx.fromAddress).toEqual(address0)
    expect(tx.toAddress).toEqual(address3)
    expect(tx.fromIndex).toEqual(0)
    expect(tx.toIndex).toEqual(3)
    expectEqualOmit(tx.inputUtxos, address0utxos, omitUtxoFieldEquality)
    expect(tx.externalOutputs).toEqual([{ address: address3, value: amount }])
    const expectedTxSize = 226
    const expectedFee = new BigNumber(feeRate)
      .times(expectedTxSize)
      .times(1e-8)
      .toString()
    expect(tx.fee).toBe(expectedFee)
    const expectedChange = new BigNumber(address0balance)
      .minus(amount)
      .minus(expectedFee)
      .toString()
    expect(tx.data.changeOutputs).toEqual([{ address: address0, value: expectedChange }])
  })
  it('create send transaction to an internal address', async () => {
    const amount = '0.01'
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

  it('can build and sign sweep transaction without utxo txHex but with lookup helper', async () => {
    const tx = await payments.createSweepTransaction(0, 3, {
      feeRate,
      feeRateType,
      availableUtxos: address0utxos.map(utxo => omit(utxo, ['txHex'])),
      lookupTxDataByHashes: async (txHashes: string[]) => {
        const { txid, txHex } = address0utxos[0]
        expect(txHashes).toEqual([txid])
        return { [txid]: txHex! }
      },
    })
    expect(tx).toBeDefined()
    expect(
      toBigNumber(tx.amount)
        .plus(tx.fee)
        .toString(),
    ).toEqual(address0balance)
    expect(tx.fromAddress).toEqual(address0)
    expect(tx.toAddress).toEqual(address3)
    expect(tx.fromIndex).toEqual(0)
    expect(tx.toIndex).toEqual(3)
    expect(tx.inputUtxos).toBeTruthy()
    expect(tx.data.rawHash).toEqual('46d4e8b57ec456ffdc5409767536d93f6b0218c060736e2db13b7d8f48e469fb')
    const signedTx = await payments.signTransaction(tx)
    expect(signedTx).toBeDefined()
    expect(signedTx.status).toBe(TransactionStatus.Signed)
    expect(signedTx.data.hex).toMatch(/^[a-f0-9]+$/)
    expect(signedTx.data.partial).toBe(false)
    expect(signedTx.data.unsignedTxHash).toMatch(/^[a-f0-9]+$/)
  })

  jest.setTimeout(300 * 1000)

  describe('getTransactionInfo', () => {
    const paymentsConfig: HdBitcoinCashPaymentsConfig = {
      hdKey: secretXprv,
      network: NetworkType.Mainnet,
      logger,
    }
    const payments = new HdBitcoinCashPayments(paymentsConfig)

    it('get multi output send', async () => {
      const tx = await payments.getTransactionInfo('3909748b7180634861df44c61bf17c0c0509c87dfb33dc9442639cc4eb97939c', {
        filterChangeAddresses: async () => {
          return [
            'bitcoincash:pzputkzlp6vm05sqkc47tz8ql6pfm2wzpsycz64tvn',
            'bitcoincash:qpwwp5zq7ns7fx4ujegfghf258d0yazfwul78c4vua',
          ]
        },
      })
      expect(tx.amount).toBe('0.07534328')
      expect(tx.externalOutputs).toEqual([
        {
          address: 'bitcoincash:pzputkzlp6vm05sqkc47tz8ql6pfm2wzpsycz64tvn',
          value: '0.07533217',
        },
        {
          address: 'bitcoincash:qpwwp5zq7ns7fx4ujegfghf258d0yazfwul78c4vua',
          value: '0.00001111',
        },
      ])
      expect(tx.inputUtxos).toEqual([
        {
          address: 'bitcoincash:qqaltza007utd8mlflamrg2xc49v0zrnuyvepla7tj',
          satoshis: 160066239,
          txid: '43d6508286b883e7a3a282547e5041b19304fac3f9ef2befac5db094fb9c982b',
          vout: 1,
          value: '1.60066239',
        },
        {
          address: 'bitcoincash:qpwwp5zq7ns7fx4ujegfghf258d0yazfwul78c4vua',
          satoshis: 1111,
          txid: 'a64fd45e6c869e539bf19d9f841ef69435d485db999a73586087a4384f568c42',
          value: '0.00001111',
          vout: 2,
        },
      ])
    })
  })

  describe('end to end', () => {
    const { addresses, sweepTxSize } = hdAccount
    const addressType = bitcoinish.AddressType.Legacy
    const paymentsConfig: HdBitcoinCashPaymentsConfig = {
      hdKey: secretXprv,
      network: NetworkType.Mainnet,
      logger,
      minChange: '0.01',
      targetUtxoPoolSize: 5,
    }
    const payments = new HdBitcoinCashPayments(paymentsConfig)
    it('get correct xpub', async () => {
      expect(payments.xpub).toEqual(xpub)
    })
    for (const iStr in addresses) {
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
        throw new Error(
          `Cannot end to end test sweeping due to lack of funds. Send BCH to any of the following addresses and try again. ${JSON.stringify(
            allAddresses,
          )}`,
        )
      }
      const recipientIndex = indexToSweep === indicesToTry[0] ? indicesToTry[1] : indicesToTry[0]
      const satPerByte = 21
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

      expect(feeNumber).toBe(expectedTxSize * satPerByte * 1e-8)
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
      const { fromIndex, toIndex } = await getFromTo(
        payments,
        'Bitcoin-cash testnet end to end send in e2e.mainnet.test',
        indicesToTry[0],
        indicesToTry[1],
        0.001,
      )

      const unsignedTx = await payments.createTransaction(fromIndex, toIndex, '0.0001', {
        useUnconfirmedUtxos: true, // Prevents consecutive tests from failing
        maxFeePercent: 100,
        feeLevel: FeeLevel.Low,
      })
      const signedTx = await payments.signTransaction(unsignedTx)
      logger.log(`Sending ${signedTx.amount} from ${fromIndex} to ${toIndex} in tx ${signedTx.id}`)
      expect(await payments.broadcastTransaction(signedTx)).toEqual({
        id: signedTx.id,
      })
      const tx = await payments.getTransactionInfo(signedTx.id)
      expect(tx.amount).toEqual(signedTx.amount)
      expect(tx.fee).toEqual(signedTx.fee)
    })
  })
})
