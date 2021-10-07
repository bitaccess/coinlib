import fs from 'fs'
import path from 'path'
import {
  BalanceResult, TransactionStatus, NetworkType, FeeRateType, BalanceActivity, UtxoInfo,
} from '@bitaccess/coinlib-common'

import {
  HdBitcoinPayments, BitcoinTransactionInfo,
  BitcoinSignedTransaction, AddressType, SinglesigAddressType,
  bitcoinish, BitcoinBalanceMonitor, BitcoinUnsignedTransaction, BaseBitcoinPayments,
} from '../src'

import { END_TRANSACTION_STATES, delay, expectEqualWhenTruthy, logger, expectUtxosEqual } from './utils'
import { toBigNumber } from '@faast/ts-common'
import fixtures from './fixtures/singlesigTestnet'
import { forcedUtxos, availableUtxos, unsignedHash, signedHex, mitxId } from './fixtures/multiInput'
import { HdBitcoinPaymentsConfig } from '../src/types'
import BigNumber from 'bignumber.js'
import { omit, pick } from 'lodash'

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
        value: '0.12666496',
        address: 'tb1qs7t3rftap0kkdar67npu4zujj6vmh4qsmym534',
        satoshis: 12666496,
        scriptPubKeyHex: undefined,
      }])
    })
  })

  describe('resolving addresses and payports of different address type', () => {
    const TESTNET_XPUB_BTC_HOT = 'tpubDDCCjNA9Xw1Fpp3xAb3yjBBCui6wZ7idJxwcgj48Z7q3yTjEpay9cc2A1bjsr344ZTNGKv5j1djvU8bgzVTwoXaAXpX8cAEYVYG1Ch7fvVu'
    const TESTNET_XPUB_BTC_DEPOSIT = 'tpubDCWCSpZSKfHb9B2ufCHBfDAVpr5S7K2XFKV53knzUrLmXuwi3HjTqkd1VGfSevwWRCDoYCuvVF3UkQAx53NQysVy3Tbd1vxTwKhHqDzJhws'

    it('resolves payports for different types for payments created from xpub', async () => {
      const hotwalletPayments = new HdBitcoinPayments({
        hdKey: secretXprv,
        network: NetworkType.Testnet,
        addressType: AddressType.SegwitNative,
        logger,
        minChange: '0.01',
        targetUtxoPoolSize: 5,
      } as HdBitcoinPaymentsConfig)

      const p2shClient = new HdBitcoinPayments({
        hdKey: hotwalletPayments.getPublicConfig().hdKey,
        network: NetworkType.Testnet,
        addressType: AddressType.SegwitP2SH,
        logger,
        minChange: '0.01',
        targetUtxoPoolSize: 5,
      } as HdBitcoinPaymentsConfig)

      const nativeClient = new HdBitcoinPayments({
        hdKey: hotwalletPayments.getPublicConfig().hdKey,
        network: NetworkType.Testnet,
        addressType: AddressType.SegwitNative,
        logger,
        minChange: '0.01',
        targetUtxoPoolSize: 5,
      } as HdBitcoinPaymentsConfig)

      const depositAddress = p2shClient.getAddress(1)
      const depositAddressFoerign = p2shClient.getAddress(1, AddressType.SegwitNative)

      const hotwalletAddress = nativeClient.getAddress(1)
      const hotwalletAddressFoerign = nativeClient.getAddress(1, AddressType.SegwitP2SH)

      expect(depositAddress).toEqual(hotwalletAddressFoerign)
      expect(hotwalletAddress).toEqual(depositAddressFoerign)

      const { address: depositAddressPP } = await p2shClient.resolvePayport(1)
      const { address: depositAddressFoerignPP } = await p2shClient.resolvePayport({
        index: 1,
        addressType: AddressType.SegwitNative
      })

      const { address: hotwalletAddressPP } = await nativeClient.resolvePayport(1)
      const { address: hotwalletAddressFoerignPP } = await nativeClient.resolvePayport({
        index: 1,
        addressType: AddressType.SegwitP2SH
      })

      expect(depositAddressPP).toEqual(hotwalletAddressFoerignPP)
      expect(hotwalletAddressPP).toEqual(depositAddressFoerignPP)
    })
  })

  async function pollUntilFound(signedTx: BitcoinSignedTransaction, payments: HdBitcoinPayments) {
    const txId = signedTx.id
    const endState = [...END_TRANSACTION_STATES, TransactionStatus.Pending]
    logger.log(`polling until status ${endState.join('|')}`, txId)
    let tx: BitcoinTransactionInfo | undefined
    let changeAddress
    if (signedTx.data.changeOutputs) {
      changeAddress = signedTx.data.changeOutputs.map((ca) => ca.address)
    }
    while (!testsComplete && (!tx || !endState.includes(tx.status))) {
      try {
        tx = await payments.getTransactionInfo(txId, undefined, { changeAddress })
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
    if (![signedTx.fromAddress, tx.fromAddress].includes('batch')) {
      expect(tx.fromAddress).toBe(signedTx.fromAddress)
    }
    if (![signedTx.toAddress, tx.toAddress].includes('batch')) {
      expect(tx.toAddress).toBe(signedTx.toAddress)
    }
    expectEqualWhenTruthy(tx.fromExtraId, signedTx.fromExtraId)
    expectEqualWhenTruthy(tx.toExtraId, signedTx.toExtraId)
    expect(tx.data).toBeDefined()
    expect(endState).toContain(tx.status)
    return tx
  }

    it('end to end multi-input send', async () => {
    /*
      p2pkh 1 n4Rk4fqGfY9HqZ41K6KNo44eG3MXA4YPMg
      p2sh-p2wpkh 1 2MyRADTg8pPEReSLL6HGYVAAQwixJ278dki
      p2wpkh 1 tb1qld8f5lh09h9ckh7spdkrz2rw4g3y0vpj0s5dla

      p2pkh 2 mhFduWNyuHrWYwPhyGZNnuDYtPVgCshGg6
      p2sh-p2wpkh 2 2N5wGX6qKBYe78LBfK8jRpsbvqnV7T6mpEP
      p2wpkh 2 tb1qzv92j7996qv7kt2fts7skqqfz5sx7cx6n00248

      p2pkh 3 mrv2DZTNQeqhj9rqDJvb8YqCEJ1Lqbwgd5
      p2sh-p2wpkh 3 2MvBJ2J4K36pYadpaoDL1JzyUtmzN4TwBgd
      p2wpkh 3 tb1q05rrngpddrtc470cg0wnq5m95u7977ega6vsut

      p2pkh 4 n12JSAoPSsMvUrAvReGMvZeHcrxiYhvGBx
      p2sh-p2wpkh 4 2MwjsSV2uh7SBWf4M6Dtmv3oogNaoWLE2Zt
      p2wpkh 4 tb1q6hm58359np407zf5e4au9zlvl3wus9klafgt2v
     */
    const paymentsConfig: HdBitcoinPaymentsConfig = {
      hdKey: secretXprv,
      network: NetworkType.Testnet,
      addressType: addressTypesToTest[0],
      logger,
      minChange: '0.0001',
      targetUtxoPoolSize: 5,
    }

    const hotWalletPayments = new HdBitcoinPayments(paymentsConfig)
    const clientPayments = new HdBitcoinPayments({
      ...paymentsConfig,
      hdKey: hotWalletPayments.getPublicConfig().hdKey
    })


    const fromIndexes: number[] = [1, 2]

    const changeAddresses = [4, 5, 6].map((i: number) => clientPayments.getAddress(i))

    const unsignedTx = await clientPayments.createMultiInputTransaction(
      fromIndexes,
      [
        {
          payport: 3,
          amount: '0.0021',
        },
      ],
      {
        useUnconfirmedUtxos: true, // Prevents consecutive tests from failing
        feeRate: '1',
        feeRateType: FeeRateType.BasePerWeight,
        changeAddress: changeAddresses,
        forcedUtxos, // total is 0.0007
        availableUtxos,
      }
    )

    expect(unsignedTx.data.rawHash).toEqual(unsignedHash)

    for (let utxo of forcedUtxos) {
      expect(unsignedTx.inputUtxos!.indexOf(utxo) >= 0)
    }
    expect(unsignedTx.fromAddress).toEqual('batch')

    expect(unsignedTx.data.changeOutputs!.length > 1)
    for (let cO of unsignedTx.data.changeOutputs!) {
      expect(changeAddresses.indexOf(cO.address) >= 0)
    }

    const signedTx = await hotWalletPayments.signTransaction(unsignedTx)

    expect(signedTx.data.unsignedTxHash).toEqual(unsignedHash)

    expectEqualWhenTruthy(unsignedTx.fromExtraId, signedTx.fromExtraId)
    expectEqualWhenTruthy(unsignedTx.toExtraId, signedTx.toExtraId)
    expect(unsignedTx.amount).toEqual(signedTx.amount)
    expect(unsignedTx.toAddress).toEqual(signedTx.toAddress)
    expect(unsignedTx.targetFeeLevel).toEqual(signedTx.targetFeeLevel)
    expect(unsignedTx.targetFeeRate).toEqual(signedTx.targetFeeRate)
    expect(unsignedTx.targetFeeRateType).toEqual(signedTx.targetFeeRateType)
    expect(unsignedTx.fee).toEqual(signedTx.fee)

    expect(signedTx.data).toBeDefined()
    expect(signedTx.data.changeOutputs!.length > 1)
    for (let cO of signedTx.data.changeOutputs!) {
      expect(changeAddresses.indexOf(cO.address) >= 0)
    }

    expect(signedTx.data.hex).toEqual(signedHex)

    const tx = await hotWalletPayments.getTransactionInfo(mitxId, undefined, { changeAddress: changeAddresses } )
    const expectedUtxos = [...forcedUtxos, ...availableUtxos]
      .map((u) => pick(u, ['txid', 'vout', 'value', 'address', 'satoshis']))
    const actualUtxos = tx.inputUtxos!


    expectUtxosEqual(expectedUtxos, actualUtxos)
    expect(tx.data.hex).toEqual(signedHex)
    expect(tx.amount).toBe('0.0021')
     expect(tx.externalOutputs).toEqual([
      { address: 'mrv2DZTNQeqhj9rqDJvb8YqCEJ1Lqbwgd5', value: '0.0021' }
    ])
  }, 5 * 60 * 1000)

  for (let i = 0; i < addressTypesToTest.length; i++) {
    let addressType = addressTypesToTest[i]
    const { xpub, addresses, sweepTxSize } = fixtures[addressType]

    describe(addressType, () => {
      const paymentsConfig: HdBitcoinPaymentsConfig = {
        hdKey: secretXprv,
        network: NetworkType.Testnet,
        addressType: addressType as SinglesigAddressType,
        logger,
        minChange: '0.01',
        targetUtxoPoolSize: 5,
      }
      const payments = new HdBitcoinPayments(paymentsConfig)
      const balanceMonitor = new BitcoinBalanceMonitor({
        network: NetworkType.Testnet,
        logger,
      })
      const recordedBalanceActivities: BalanceActivity[] = []
      let addressesToWatch: string[] = []
      let startBlockHeight: number

      let sweepTx: BitcoinUnsignedTransaction
      let sweepTxInfo: BitcoinTransactionInfo

      let sendTx: BitcoinUnsignedTransaction
      let sendTxInfo: BitcoinTransactionInfo

      beforeAll(async () => {
        await balanceMonitor.init()
        addressesToWatch = [...SWEEP_INDICES, ...SEND_INDICES].map((i) => payments.getAddress(i))
        logger.log('addressesToWatch', addressesToWatch)
        await balanceMonitor.subscribeAddresses(addressesToWatch)
        balanceMonitor.onBalanceActivity((ba, rawTx) => {
          logger.log('recorded balance activity', ba)
          recordedBalanceActivities.push(ba)
        })
        startBlockHeight = (await payments.getBlock()).height
      }, 15 * 1000)

      afterAll(async () => {
        await balanceMonitor.destroy()
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
          maxFeePercent: 100,
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
        const tx = await pollUntilFound(signedTx, payments)
        expect(tx.amount).toEqual(signedTx.amount)
        expect(tx.fee).toEqual(signedTx.fee)
        sweepTx = unsignedTx
        sweepTxInfo = tx
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
            maxFeePercent: 100,
          },
        )
        const signedTx = await payments.signTransaction(unsignedTx)
        logger.log(`Sending ${signedTx.amount} from ${indexToSend} to ${recipientIndex} in tx ${signedTx.id}`)
        expect(await payments.broadcastTransaction(signedTx)).toEqual({
          id: signedTx.id,
        })
        const tx = await pollUntilFound(signedTx, payments)
        expect(tx.amount).toEqual(signedTx.amount)
        expect(tx.fee).toEqual(signedTx.fee)
        sendTx = unsignedTx
        sendTxInfo = tx
      }, 5 * 60 * 1000)

      function compareBalanceActivities(
        a: Pick<BalanceActivity, 'externalId' | 'address'>,
        b: Pick<BalanceActivity, 'externalId' | 'address'>,
      ) {
        return a.externalId.localeCompare(b.externalId) || a.address.localeCompare(b.address)
      }

      // Fields to ignore for test equality purposes (ie unpredictable values)
      const IGNORED_BALANCE_ACTIVITY_FIELDS = ['timestamp', 'lockTime', 'confirmationId', 'confirmations', 'confirmationNumber'] as const
      const IGNORED_UTXO_FIELDS = ['confirmations', 'lockTime', 'signer', 'height'] as const
      type PartialBalanceActivity = Omit<BalanceActivity, typeof IGNORED_BALANCE_ACTIVITY_FIELDS[number]>
      function sortAndOmitBalanceActivities(
        activities: Array<PartialBalanceActivity>,
      ) {
        return [...activities].sort(compareBalanceActivities).map((ba) => ({
          ...omit(ba, IGNORED_BALANCE_ACTIVITY_FIELDS),
          utxosCreated: ba.utxosCreated?.map((utxo) => omit(utxo, IGNORED_UTXO_FIELDS)),
          utxosSpent: ba.utxosSpent?.map((utxo) => omit(utxo, IGNORED_UTXO_FIELDS)),
        }))
      }

      function markSpent(utxos: UtxoInfo[]) {
        return utxos.map((utxo) => ({ ...utxo, spent: true }))
      }

      it('recorded all balance activities', async () => {
        const expectedActivities: PartialBalanceActivity[] = [
          {
            'address': sweepTx.fromAddress,
            'amount': new BigNumber(sweepTx.amount).plus(sweepTx.fee).times(-1).toString(),
            'externalId': sweepTxInfo.id,
            'assetSymbol': 'BTC',
            'networkSymbol': 'BTC',
            'networkType': NetworkType.Testnet,
            'activitySequence': '',
            'extraId': null,
            'type': 'out',
            'utxosCreated': [],
            'utxosSpent': markSpent(sweepTx.inputUtxos ?? []),
          },
          {
            'activitySequence': '',
            'address': sweepTx.toAddress,
            'amount': new BigNumber(sweepTx.amount).toString(),
            'externalId': sweepTxInfo.id,
            'assetSymbol': 'BTC',
            'networkSymbol': 'BTC',
            'networkType': NetworkType.Testnet,
            'extraId': null,
            'type': 'in',
            'utxosCreated': [
              {
                'coinbase': false,
                'confirmations': 0,
                'height': undefined,
                'satoshis': new BigNumber(sweepTx.amount).times(1e8).toNumber(),
                'txid': sweepTxInfo.id,
                'value': sweepTx.amount,
                'vout': 0,
                'txHex': sweepTxInfo.data.hex,
                'scriptPubKeyHex': sweepTxInfo.data.vout[0].hex,
                'address': sweepTx.toAddress,
                'spent': false,
              },
            ],
            'utxosSpent': [],
          },
          {
            'activitySequence': '',
            'address': sendTx.fromAddress,
            'amount': new BigNumber(sendTxInfo.amount).plus(sendTxInfo.fee).times(-1).toString(),
            'externalId': sendTxInfo.id,
            'assetSymbol': 'BTC',
            'networkSymbol': 'BTC',
            'networkType': NetworkType.Testnet,
            'extraId': null,
            'type': 'out',
            'utxosCreated': (sendTx.data.changeOutputs ?? []).map((changeOutput, i) => ({
              'coinbase': false,
              'confirmations': 0,
              'height': undefined,
              'satoshis': new BigNumber(changeOutput.value).times(1e8).toNumber(),
              'txid': sendTxInfo.id,
              'value': changeOutput.value,
              'vout': 1 + i,
              'txHex': sendTxInfo.data.hex,
              'scriptPubKeyHex': sendTxInfo.data.vout[1 + i].hex,
              'address': sendTx.fromAddress,
              'spent': false,
            })),
            'utxosSpent': markSpent(sendTx.inputUtxos ?? []),
          },
          {
            'activitySequence': '',
            'address': sendTxInfo.toAddress!,
            'amount': sendTx.amount,
            'externalId': sendTxInfo.id,
            'assetSymbol': 'BTC',
            'networkSymbol': 'BTC',
            'networkType': NetworkType.Testnet,
            'extraId': null,
            'type': 'in',
            'utxosCreated': [
              {
                'coinbase': false,
                'confirmations': 0,
                'height': undefined,
                'satoshis': new BigNumber(sendTx.amount).times(1e8).toNumber(),
                'txid': sendTxInfo.id,
                'value': sendTx.amount,
                'vout': 0,
                'txHex': sendTxInfo.data.hex,
                'scriptPubKeyHex': sendTxInfo.data.vout[0].hex,
                'address': sendTxInfo.toAddress!,
                'spent': false,
              },
            ],
            'utxosSpent': [],
          },
        ]
        expect(sortAndOmitBalanceActivities(recordedBalanceActivities))
          .toEqual(sortAndOmitBalanceActivities(expectedActivities))
      }, 10 * 1000)

      it('can retrieve past activities', async () => {
        const pastActivities: BalanceActivity[] = []
        await Promise.all(addressesToWatch.map((a) => balanceMonitor.retrieveBalanceActivities(a, (ba, rawTx) => {
          if (ba.externalId === sweepTxInfo.id || ba.externalId === sendTxInfo.id) {
            // ignore irrelevant transactions (ie past tests)
            pastActivities.push(ba)
          }
        }, { from: startBlockHeight })))
        expect(sortAndOmitBalanceActivities(pastActivities))
          .toEqual(sortAndOmitBalanceActivities(recordedBalanceActivities))
      })

      it('can retrieve block activities', async () => {
        const blockActivities: BalanceActivity[] = []
        const blockNumber = 1975840
        const blockInfo = await balanceMonitor.retrieveBlockBalanceActivities(blockNumber, (activity) => {
          blockActivities.push(activity)
        }, (addresses) => addresses.filter((address) => addressesToWatch.includes(address)))
        expect(omit(blockInfo, ['raw'])).toEqual({
          height: blockNumber,
          id: '00000000ee9885aa6108e75a02fd815d9ca5bac8f312077e363e961c48fc70f6',
          previousId: '000000000000000e4cd33a7350e719d46bfd5fd25b57832cd3342a883a8ac0fb',
          time: new Date(1621349965000),
        })
        logger.log('blockActivities', addressType, blockActivities)
        expect(blockActivities.length).toBe(6)
        for (let activity of blockActivities) {
          expect(addressesToWatch).toContain(activity.address)
          expect(activity.confirmationNumber).toBe(blockNumber)
        }
      })
    })
  }
})
