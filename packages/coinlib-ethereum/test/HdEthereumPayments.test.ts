import { BigNumber } from 'bignumber.js'
import { HdEthereumPayments } from '../src/HdEthereumPayments'
import { DEFAULT_PATH_FIXTURE, hdAccount } from './fixtures/accounts'
import { TestLogger } from '../../../common/testUtils'
import { EthereumBIP44 } from '../src/bip44'

import { NetworkType, FeeLevel, FeeOption, FeeRateType, TransactionStatus } from '@bitaccess/coinlib-common'
import nock from 'nock'

import {
  getGasStationResponse,
  getNextNonceMocks,
  getBalanceMocks,
  getTransactionCountMocks,
  getSendRawTransactionMocks,
  getEstimateGasMocks,
  getTransactionApisMocks,
} from './fixtures/mocks'
import { EthereumSignedTransaction, EthereumUnsignedTransaction, DEFAULT_DERIVATION_PATH } from '../src'

const GAS_STATION_URL = 'https://gasstation.test.url'
const PARITY_URL = 'https://parity.test.url'
const INFURA_URL = 'https://infura.test.url'
const BLOCKBOOK_URL = 'https://blockbook.test.url'
const nockG = nock(GAS_STATION_URL)
const nockP = nock(PARITY_URL)
const nockI = nock(INFURA_URL)

const logger = new TestLogger('HdEthereumPaymentsTest')

const CONFIG = {
  network: NetworkType.Testnet,
  gasStation: GAS_STATION_URL,
  parityNode: PARITY_URL,
  fullNode: INFURA_URL,
  hdKey: DEFAULT_PATH_FIXTURE.xkeys.xprv,
  logger,
  blockbookNode: BLOCKBOOK_URL,
}

const BIP44 = EthereumBIP44.fromXKey(DEFAULT_PATH_FIXTURE.xkeys.xprv)
const INSTANCE_KEYS = BIP44.getSignatory(0)
const FROM_ADDRESS = BIP44.getAddress(1).toLowerCase()
const TO_ADDRESS = BIP44.getAddress(2).toLowerCase()

// web3 sequential id used by nock
let id = 1

// methods from base
describe('HdEthereumPayments', () => {
  let hdEP: HdEthereumPayments

  beforeEach(() => {
    hdEP = new HdEthereumPayments(CONFIG)
  })

  describe('BaseEthereumPayments methods', () => {
    describe('async init', () => {
      test('does nothing', async () => {
        const res = await hdEP.init()
        expect(res).toBeUndefined()
      })
    })

    describe('async destroy', () => {
      test('does nothing', async () => {
        const res = await hdEP.destroy()
        expect(res).toBeUndefined()
      })
    })

    describe('async getAvailableUtxos', () => {
      test('returns empty array', async () => {
        const res = await hdEP.getAvailableUtxos()
        expect(res).toStrictEqual([])
      })
    })

    describe('async usesSequenceNumber', () => {
      test('returns true', async () => {
        const res = hdEP.usesSequenceNumber()
        expect(res)
      })
    })

    describe('async usesUtxos', () => {
      test('returns false', async () => {
        const res = hdEP.usesUtxos()
        expect(res).toBe(false)
      })
    })

    describe('getFullConfig', () => {
      test('returns full config', () => {
        expect(hdEP.getFullConfig()).toStrictEqual(CONFIG)
      })
    })

    describe('resolvePayport', () => {
      test('returns payport derived from the provided index', async () => {
        expect(await hdEP.resolvePayport(1)).toStrictEqual({ address: FROM_ADDRESS.toLowerCase() })
      })

      test('returns payport using input address', async () => {
        expect(await hdEP.resolvePayport(FROM_ADDRESS)).toStrictEqual({ address: FROM_ADDRESS.toLowerCase() })
      })

      test('returns payport using input payport', async () => {
        expect(await hdEP.resolvePayport({ address: FROM_ADDRESS })).toStrictEqual({
          address: FROM_ADDRESS.toLowerCase(),
        })
      })

      test('returns payport using input payport with index', async () => {
        expect(await hdEP.resolvePayport({ index: 1, address: FROM_ADDRESS })).toStrictEqual({
          index: 1,
          address: FROM_ADDRESS.toLowerCase(),
        })
      })

      test('thorws an error for invalid address', async () => {
        let err: string = ''
        try {
          await hdEP.resolvePayport('1')
        } catch (e) {
          err = e.message
        }
        expect(err).toBe('Invalid Ethereum address: 1')
      })

      test('thorws an error for invalid object', async () => {
        let err: string = ''
        try {
          await hdEP.resolvePayport({ address: '1' })
        } catch (e) {
          err = e.message
        }
        expect(err).toBe('Invalid Ethereum payport: {"address":"1"}')
      })
    })

    describe('resolveFromTo', () => {
      test('returns FromTo object', async () => {
        const res = await hdEP.resolveFromTo(1, TO_ADDRESS)
        expect(res).toStrictEqual({
          fromExtraId: undefined,
          fromAddress: FROM_ADDRESS.toLowerCase(),
          fromIndex: 1,
          fromPayport: { address: FROM_ADDRESS.toLowerCase() },
          toAddress: TO_ADDRESS.toLowerCase(),
          toIndex: null,
          toExtraId: undefined,
          toPayport: { address: TO_ADDRESS.toLowerCase() },
        })
      })
    })

    describe('resolveFeeOption', () => {
      /*
       * 1 ETH = 100
       * WeigasForTX = 5
       * GasPriceLWei = 1;
       * GasPriceMWei = 2;
       * GasPriceHWei = 3;
       * { feeLevel: FeeLevel.Low } => { targetFeeRate: 1, targetFeeRateType: BasePerWeight, feeMain: 0.05,  feeBase: 5,  targetFeeLevel: FeeLevel.Low, gasPrice: 1 }
       * { feeLevel: FeeLevel.Medium } => { targetFeeRate: 2, targetFeeRateType: BasePerWeight, feeMain: 0.1, feeBase: 10, targetFeeLevel: FeeLevel.Medium, gasPrice: 2 }
       * { feeLevel: FeeLevel.High } => { targetFeeRate: 3, targetFeeRateType: BasePerWeight, feeMain: 0.15, feeBase: 15, targetFeeLevel: FeeLevel.High, gasPrice: 3 }
       * { feeRate: '200000', feeRateType: FeeRateType.Base } => { targetFeeRate: 200000, targetFeeRateType: Base, feeBase: 200000, feeMain: 200, targetFeeLevel: FeeLevel.Custom, gasPrice: 200000 / 5 }
       * { feeRate: '0.2', feeRateType: FeeRateType.Main } => { targetFeeRate: 0.2, targetFeeRateType: Main, feeBase: 20, feeMain: 0.2, targetFeeLevel: FeeLevel.Custom, gasPrice: 20 / 5 }
       * { feeRate: '200', feeRateType: FeeRateType.BasePerWeight } => { targetFeeRate: 200, targetFeeRateType: BasePerWeight, feeBase: 200 * 5, feeMain: 2 * 5, targetFeeLevel: FeeLevel.Custom, gasPrice: 200 }
       * { feeLevel: FeeLevel.Custom, feeRate: '200000', feeRateType: FeeRateType.Base } => { targetFeeRate: 200000, targetFeeRateType: Base, feeBase: 200000, feeMain: 200, targetFeeLevel: FeeLevel.Custom, gasPrice: 200000 / 5 }
       * { feeLevel: FeeLevel.Custom, feeRate: '0.2', feeRateType: FeeRateType.Main } => { targetFeeRate: 0.2, targetFeeRateType: Main, feeBase: 20, feeMain: 0.2, targetFeeLevel: FeeLevel.Custom, gasPrice: 20 / 5 }
       * { feeLevel: FeeLevel.Custom, feeRate: '200', feeRateType: FeeRateType.BasePerWeight } => { targetFeeRate: 200, targetFeeRateType: BasePerWeight, feeBase: 200 * 5, feeMain: 2 * 5, targetFeeLevel: FeeLevel.Custom, gasPrice: 200 }
       */
      test('fallback to default for {} as an input', async () => {
        nockG.get('/json/ethgasAPI.json').reply(200, getGasStationResponse())

        const res = await hdEP.resolveFeeOption({})
        expect(res).toStrictEqual({
          targetFeeRate: '3000000000',
          gasPrice: '3000000000',
          targetFeeLevel: 'medium',
          targetFeeRateType: FeeRateType.BasePerWeight,
          feeBase: '150000000000000',
          feeMain: '0.00015',
        })
      })

      test('input parameter has property feeLevel', async () => {
        nockG.get('/json/ethgasAPI.json').reply(200, getGasStationResponse())

        const res = await hdEP.resolveFeeOption({ feeLevel: FeeLevel.Low })
        expect(res).toStrictEqual({
          targetFeeRate: '1000000000',
          gasPrice: '1000000000',
          targetFeeLevel: FeeLevel.Low,
          targetFeeRateType: FeeRateType.BasePerWeight,
          feeBase: '50000000000000',
          feeMain: '0.00005',
        })
      })

      test('input parameter has feeOptions', async () => {
        const resMain = await hdEP.resolveFeeOption({
          feeRate: '1',
          feeRateType: FeeRateType.Main,
        } as FeeOption)
        expect(resMain).toStrictEqual({
          targetFeeRate: '1',
          gasPrice: '20000000000000',
          targetFeeLevel: 'custom',
          targetFeeRateType: FeeRateType.Main,
          feeBase: '1000000000000000000',
          feeMain: '1',
        })

        const resBase = await hdEP.resolveFeeOption({
          feeRate: '1000000000000000001',
          feeRateType: FeeRateType.Base,
        } as FeeOption)
        expect(resBase).toStrictEqual({
          targetFeeRate: '1000000000000000001',
          gasPrice: '20000000000000',
          targetFeeLevel: 'custom',
          targetFeeRateType: FeeRateType.Base,
          feeBase: '1000000000000000000',
          feeMain: '1',
        })
      })
    })

    describe('requiresBalanceMonitor', () => {
      test('returns false', () => {
        expect(hdEP.requiresBalanceMonitor()).toBe(false)
      })
    })

    describe('getBalance', () => {
      test('sends rpc request to node with correct paramaters', async () => {
        const balanceMocks = getBalanceMocks(id++, FROM_ADDRESS, '10000000')
        nockI.post(/.*/, balanceMocks.req).reply(200, balanceMocks.res)

        nockG.get('/json/ethgasAPI.json').reply(200, getGasStationResponse())

        const res = await hdEP.getBalance({ address: FROM_ADDRESS })

        expect(res).toStrictEqual({
          confirmedBalance: '0.00000000001',
          unconfirmedBalance: '0',
          spendableBalance: '0.00000000001',
          sweepable: false,
          requiresActivation: false,
        })
      })
    })

    describe('getNextSequenceNumber', () => {
      test('returns nonce for account', async () => {
        const parityMock = getNextNonceMocks(1, FROM_ADDRESS, '0x1b')
        nockP.post(/.*/, parityMock.req).reply(200, parityMock.res)

        const transactionCountMocks = getTransactionCountMocks(id++, FROM_ADDRESS, '0x1a')
        nockI.post(/.*/, transactionCountMocks.req).reply(200, transactionCountMocks.res)

        expect(await hdEP.getNextSequenceNumber(FROM_ADDRESS)).toBe('27')
      })
    })

    describe('getTransactionInfo', () => {
      test('returns unconfirmed transaction by id)', async () => {
        const txId = '0x9fc76417374aa880d4449a1f7f31ec597f00b1f6f3dd2d66f4c9c6c445836d8b'
        const blockId = '0xef95f2f1ed3ca60b048b4bf67cde2195961e0bba6f70bcbea9a2c4e133e34b46'
        const amount = '123450000000000000'

        id = getTransactionApisMocks({
          requestId: id,
          txId,
          blockId,
          blockNumber: '0x3',
          amount,
          fromAddress: FROM_ADDRESS,
          toAddress: TO_ADDRESS,
          nock: nockI,
          isConfirmed: false,
          isFailedTransaction: false,
        })

        const res = await hdEP.getTransactionInfo(txId)

        expect(res).toStrictEqual({
          id: txId,
          amount: '0.12345',
          toAddress: TO_ADDRESS.toLowerCase(),
          fromAddress: FROM_ADDRESS.toLowerCase(),
          fromExtraId: null,
          toExtraId: null,
          fromIndex: null,
          toIndex: null,
          fee: '0.042',
          sequenceNumber: 2,
          weight: 21000,
          isExecuted: false,
          isConfirmed: false,
          confirmations: 0,
          confirmationId: blockId,
          confirmationTimestamp: null,
          confirmationNumber: null,
          status: 'pending',
          currentBlockNumber: 3,
          data: {
            hash: txId,
            nonce: 2,
            blockHash: blockId,
            transactionIndex: 0,
            from: FROM_ADDRESS,
            to: TO_ADDRESS,
            value: '123450000000000000',
            gas: 21000,
            gasPrice: '2000000000000',
            input: '0x57cb2fc4',
            gasUsed: 21000,
            blockTime: null,
            blockNumber: null,
            currentBlockNumber: 3,
            dataProvider: 'infura',
            contractAddress: null,
          },
        })
      })

      test('returns confirmed transaction by id', async () => {
        const txId = '0x9fc76417374aa880d4449a1f7f31ec597f00b1f6f3dd2d66f4c9c6c445836d8b'
        const blockId = '0xef95f2f1ed3ca60b048b4bf67cde2195961e0bba6f70bcbea9a2c4e133e34b46'
        const amount = '123450000000000000'
        const blockNumber = '0x3'

        id = getTransactionApisMocks({
          requestId: id,
          txId,
          blockId,
          blockNumber,
          amount,
          fromAddress: FROM_ADDRESS,
          toAddress: TO_ADDRESS,
          nock: nockI,
          isConfirmed: true,
          isFailedTransaction: false,
        })

        const res = await hdEP.getTransactionInfo(txId)

        expect(res).toStrictEqual({
          id: txId,
          amount: '0.12345',
          toAddress: TO_ADDRESS.toLowerCase(),
          fromAddress: FROM_ADDRESS.toLowerCase(),
          toExtraId: null,
          fromExtraId: null,
          fromIndex: null,
          toIndex: null,
          fee: '0.042',
          sequenceNumber: 2,
          weight: 21000,
          isExecuted: true,
          isConfirmed: true,
          confirmations: 12,
          confirmationId: blockId,
          confirmationTimestamp: new Date('2015-04-17T16:21:29.000Z'),
          confirmationNumber: Number(blockNumber),
          status: 'confirmed',
          currentBlockNumber: 15,
          data: {
            hash: txId,
            nonce: 2,
            blockHash: blockId,
            blockNumber: 3,
            transactionIndex: 0,
            from: FROM_ADDRESS.toLowerCase(),
            to: TO_ADDRESS.toLowerCase(),
            value: '123450000000000000',
            gas: 21000,
            gasPrice: '2000000000000',
            input: '0x57cb2fc4',
            gasUsed: 21000,
            blockTime: new Date('2015-04-17T16:21:29.000Z'),
            currentBlockNumber: 15,
            dataProvider: 'infura',
            contractAddress: null,
          },
        })
      })

      test('returns transaction by id (included into block and failed)', async () => {
        const txId = '0x9fc76417374aa880d4449a1f7f31ec597f00b1f6f3dd2d66f4c9c6c445836d8b'
        const blockId = '0xef95f2f1ed3ca60b048b4bf67cde2195961e0bba6f70bcbea9a2c4e133e34b46'
        const amount = '123450000000000000'
        const blockNumber = '0x3'

        id = getTransactionApisMocks({
          requestId: id,
          txId,
          blockId,
          blockNumber,
          amount,
          fromAddress: FROM_ADDRESS,
          toAddress: TO_ADDRESS,
          nock: nockI,
          isConfirmed: true,
          isFailedTransaction: true,
        })

        const res = await hdEP.getTransactionInfo(txId)

        expect(res).toStrictEqual({
          id: txId,
          amount: '0.12345',
          toAddress: TO_ADDRESS.toLowerCase(),
          fromAddress: FROM_ADDRESS.toLowerCase(),
          toExtraId: null,
          fromExtraId: null,
          fromIndex: null,
          toIndex: null,
          fee: '0.042',
          sequenceNumber: 2,
          weight: 21000,
          isExecuted: false,
          isConfirmed: true,
          confirmations: 12,
          confirmationId: blockId,
          confirmationTimestamp: new Date('2015-04-17T16:21:29.000Z'),
          status: 'failed',
          currentBlockNumber: 15,
          confirmationNumber: Number(blockNumber),
          data: {
            hash: txId,
            nonce: 2,
            blockHash: blockId,
            blockNumber: 3,
            transactionIndex: 0,
            from: FROM_ADDRESS.toLowerCase(),
            to: TO_ADDRESS.toLowerCase(),
            value: '123450000000000000',
            gas: 21000,
            gasPrice: '2000000000000',
            input: '0x57cb2fc4',
            gasUsed: 21000,
            blockTime: new Date('2015-04-17T16:21:29.000Z'),
            currentBlockNumber: 15,
            dataProvider: 'infura',
            contractAddress: null,
          },
        })
      })
    })

    describe('createTransaction', () => {
      test('creates transaction object if account has sufficient balance', async () => {
        const from = 1
        const to = { address: TO_ADDRESS }
        const amountEth = '0.005'

        const estimateGasMocks = getEstimateGasMocks(id++, FROM_ADDRESS, TO_ADDRESS, '0xaaaa')
        nockI.post(/.*/, estimateGasMocks.req).reply(200, estimateGasMocks.res)

        // nock for get balance
        const balanceMocks = getBalanceMocks(id++, FROM_ADDRESS, '9999999999999999999999999999')
        nockI.post(/.*/, balanceMocks.req).reply(200, balanceMocks.res)

        // nock for gas station
        nockG.get('/json/ethgasAPI.json').reply(200, getGasStationResponse())

        const transactionCountMocks = getTransactionCountMocks(id++, FROM_ADDRESS, '0x1a')
        nockI.post(/.*/, transactionCountMocks.req).reply(200, transactionCountMocks.res)

        const parityMock = getNextNonceMocks(1, FROM_ADDRESS, '0x1b')
        nockP.post(/.*/, parityMock.req).reply(200, parityMock.res)

        const res = await hdEP.createTransaction(from, to, amountEth)

        expect(res).toStrictEqual({
          id: null,
          status: 'unsigned',
          fromAddress: FROM_ADDRESS.toLowerCase(),
          toAddress: TO_ADDRESS.toLowerCase(),
          toExtraId: null,
          fromIndex: 1,
          toIndex: null,
          amount: amountEth,
          fee: '0.00015',
          targetFeeLevel: 'medium',
          targetFeeRate: '3000000000',
          targetFeeRateType: 'base/weight',
          sequenceNumber: '27',
          weight: 50000,
          data: {
            from: FROM_ADDRESS.toLowerCase(),
            to: TO_ADDRESS.toLowerCase(),
            value: '0x11c37937e08000',
            gas: '0xc350',
            gasPrice: '0xb2d05e00',
            nonce: '0x1b',
          },
        })

        const data: any = res.data

        expect(new BigNumber(data.value, 16).toString()).toBe(hdEP.toBaseDenomination(amountEth))
      })

      test('creates transaction object if account has insufficient balance', async () => {
        const from = 1
        const to = { address: TO_ADDRESS }
        const amountEth = '50000'

        const estimateGasMocks = getEstimateGasMocks(id++, FROM_ADDRESS, TO_ADDRESS, '0xaaaa')
        nockI.post(/.*/, estimateGasMocks.req).reply(200, estimateGasMocks.res)

        // nock for get balance
        const balanceMocks = getBalanceMocks(id++, FROM_ADDRESS, '49999')
        nockI.post(/.*/, balanceMocks.req).reply(200, balanceMocks.res)

        nockG.get('/json/ethgasAPI.json').reply(200, getGasStationResponse())

        const transactionCountMocks = getTransactionCountMocks(id++, FROM_ADDRESS, '0x1a')
        nockI.post(/.*/, transactionCountMocks.req).reply(200, transactionCountMocks.res)

        const parityMock = getNextNonceMocks(1, FROM_ADDRESS, '0x1b')
        nockP.post(/.*/, parityMock.req).reply(200, parityMock.res)

        let err: string = ''
        try {
          const res = await hdEP.createTransaction(from, to, amountEth)
        } catch (e) {
          err = e.message
        }
        expect(err.match(/Insufficient balance /))
      })
    })

    describe('createSweepTransaction', () => {
      test('creates transaction object if account has sufficient balance', async () => {
        const from = 1
        const to = { address: '0x6295eE1B4F6dD65047762F924Ecd367c17eaBf8f' }
        const balance = '142334532324980082'

        const estimateGasMocks = getEstimateGasMocks(id++, FROM_ADDRESS, to.address, '0x52bc')
        nockI.post(/.*/, estimateGasMocks.req).reply(200, estimateGasMocks.res)

        // nock for get balance
        const balanceMocks = getBalanceMocks(id++, FROM_ADDRESS, balance)
        nockI.post(/.*/, balanceMocks.req).reply(200, balanceMocks.res)

        // nock for gas station
        nockG.get('/json/ethgasAPI.json').reply(200, getGasStationResponse())

        const transactionCountMocks = getTransactionCountMocks(id++, FROM_ADDRESS, '0x1a')
        nockI.post(/.*/, transactionCountMocks.req).reply(200, transactionCountMocks.res)

        const parityMock = getNextNonceMocks(1, FROM_ADDRESS, '0x1b')
        nockP.post(/.*/, parityMock.req).reply(200, parityMock.res)

        const res = await hdEP.createSweepTransaction(from, to)

        const feeEth = res.fee
        const transactionValueEth = new BigNumber(hdEP.toMainDenomination(balance)).minus(feeEth).toString()

        expect(res).toStrictEqual({
          id: null,
          status: 'unsigned',
          fromAddress: FROM_ADDRESS.toLowerCase(),
          toAddress: to.address.toLowerCase(),
          toExtraId: null,
          fromIndex: 1,
          toIndex: null,
          amount: transactionValueEth,
          fee: feeEth,
          targetFeeLevel: 'medium',
          targetFeeRate: '3000000000',
          targetFeeRateType: 'base/weight',
          sequenceNumber: '27',
          weight: 31770,
          data: {
            from: FROM_ADDRESS.toLowerCase(),
            to: to.address.toLowerCase(),
            value: '0x1f955d1afcee972',
            gas: '0x7c1a',
            gasPrice: '0xb2d05e00',
            nonce: '0x1b',
          },
        })

        const data: any = res.data

        const resValueD = new BigNumber(data.value, 16)
        const resGasD = new BigNumber(data.gas, 16)
        const resGasPD = new BigNumber(data.gasPrice, 16)

        expect(new BigNumber(res.amount).plus(res.fee).toString()).toBe(hdEP.toMainDenomination(balance))

        expect(resValueD.toString()).toBe(hdEP.toBaseDenomination(transactionValueEth))
        expect(resGasD.multipliedBy(resGasPD).toString()).toBe(hdEP.toBaseDenomination(feeEth))
      })

      test('creates transaction object if account has insufficient balance', async () => {
        const from = 1
        const to = { address: TO_ADDRESS }

        const estimateGasMocks = getEstimateGasMocks(id++, FROM_ADDRESS, TO_ADDRESS, '0x52bc')
        nockI.post(/.*/, estimateGasMocks.req).reply(200, estimateGasMocks.res)

        // nock for get balance
        const balanceMocks = getBalanceMocks(id++, FROM_ADDRESS, '999')
        nockI.post(/.*/, balanceMocks.req).reply(200, balanceMocks.res)

        // nock for gas station
        nockG.get('/json/ethgasAPI.json').reply(200, getGasStationResponse())

        const transactionCountMocks = getTransactionCountMocks(id++, FROM_ADDRESS, '0x1a')
        nockI.post(/.*/, transactionCountMocks.req).reply(200, transactionCountMocks.res)

        const parityMock = getNextNonceMocks(1, FROM_ADDRESS, '0x1b')
        nockP.post(/.*/, parityMock.req).reply(200, parityMock.res)

        let err: string = ''
        try {
          const res = await hdEP.createSweepTransaction(from, to)
        } catch (e) {
          err = e.message
        }
        expect(err.match(/Insufficient balance /))
      })
    })

    describe('signTransaction', () => {
      test('signs transaction and returns data', async () => {
        const from = 1
        const to = { address: TO_ADDRESS }
        const amountEth = '0.576'

        const unsignedTx: EthereumUnsignedTransaction = {
          id: null,
          status: TransactionStatus.Unsigned,
          fromAddress: FROM_ADDRESS.toLowerCase(),
          toAddress: TO_ADDRESS.toLowerCase(),
          toExtraId: null,
          fromIndex: 1,
          toIndex: null,
          amount: amountEth,
          fee: '0.0063156',
          targetFeeLevel: FeeLevel.Medium,
          targetFeeRate: '0',
          targetFeeRateType: FeeRateType.Base,
          sequenceNumber: '27',
          weight: 21000,
          data: {
            from: FROM_ADDRESS.toLowerCase(),
            to: to.address.toLowerCase(),
            value: '0x1e33c7f8ff55572',
            gas: '0x523c',
            gasPrice: '0x45d964b800',
            nonce: '0x1b',
          },
        }

        const res = await hdEP.signTransaction(unsignedTx)

        expect(res).toStrictEqual({
          id: '0x3137b3336975aabfcf141469727d8d805f5e6d343de7fcc93e61d8d19d5d238f',
          status: 'signed',
          fromAddress: FROM_ADDRESS.toLowerCase(),
          toAddress: to.address.toLowerCase(),
          toExtraId: null,
          fromIndex: 1,
          toIndex: null,
          amount: amountEth,
          fee: '0.0063156',
          targetFeeLevel: 'medium',
          targetFeeRate: '0',
          targetFeeRateType: 'base',
          sequenceNumber: '27',
          weight: 21000,
          data: {
            hex:
              '0xf86c1b8545d964b80082523c948f0bb36577b19da9826fc726fec2b4943c45e0148801e33c7f8ff555728029a0a7dafa27f75d1fd50e8544a0f1f31ac4275a65855b05585fdbe2796fab967e5aa057b626e4f993d1e2152fb0fa1ca72943aacaf27d56adca2f3f195ab90d253d73',
          },
        })
      })
    })

    describe('broadcastTransaction', () => {
      test('sends signed transaction', async () => {
        const txId = '0x3137b3336975aabfcf141469727d8d805f5e6d343de7fcc93e61d8d19d5d238f'
        const rawTx =
          '0xf86c0185746a528800825208948f0bb36577b19da9826fc726fec2b4943c45e01488069e4a05f56240008029a0961ab2c131cfb09bbb1d71825615d30634889f95b62390473d1691ba419f86f8a0514d1b9d42888a01cb5cfb7aba6623f4caad4b952943f243c644b3e7aaf409b3'

        const signedTx: EthereumSignedTransaction = {
          id: txId,
          status: TransactionStatus.Signed,
          fromAddress: FROM_ADDRESS.toLowerCase(),
          toAddress: TO_ADDRESS.toLowerCase(),
          toExtraId: null,
          fromIndex: 1,
          toIndex: null,
          amount: '0.576',
          fee: '0.0063156',
          targetFeeLevel: FeeLevel.Medium,
          targetFeeRate: '0',
          targetFeeRateType: FeeRateType.Base,
          sequenceNumber: '27',
          data: { hex: rawTx },
        }

        // sends rpc request with transaction and receives id
        const rawTxMock = getSendRawTransactionMocks(id++, rawTx, txId)
        nockI.post(/.*/, rawTxMock.req).reply(200, rawTxMock.res)

        const res = await hdEP.broadcastTransaction(signedTx)

        expect(res).toStrictEqual({
          id: txId,
        })
      })
    })
  })

  describe('native methods', () => {
    describe('static generateNewKeys', () => {
      test('generates new keys', () => {
        const res = HdEthereumPayments.generateNewKeys()

        expect(res.address)
        expect(res.xkeys.xpub).toMatch(/^xpub.+$/)
        expect(res.xkeys.xprv).toMatch(/^xprv.+$/)
        expect(res.keys.prv)
        expect(res.keys.pub)
      })
    })

    describe('getXpub', () => {
      test('returns xpub derived by 0th index from xkey provided in config', () => {
        expect(hdEP.getXpub()).toBe(INSTANCE_KEYS.xkeys.xpub)
      })
    })

    describe('getPublicConfig', () => {
      test('returns public part of the provided config data', () => {
        const pubConf = hdEP.getPublicConfig()
        expect(pubConf).toStrictEqual({
          depositKeyIndex: 0,
          network: NetworkType.Testnet,
          derivationPath: DEFAULT_DERIVATION_PATH,
          hdKey: INSTANCE_KEYS.xkeys.xpub,
        })
      })
    })

    describe('getAccountId', () => {
      test('returns xpub regardless of index', () => {
        expect(hdEP.getAccountId()).toBe(INSTANCE_KEYS.xkeys.xpub)
      })
    })

    describe('getAccountIds', () => {
      test('returns array with xpub as only element', () => {
        expect(hdEP.getAccountIds()).toStrictEqual([INSTANCE_KEYS.xkeys.xpub])
      })
    })

    describe('getPayport', () => {
      test('returns object address derived from the provided key', async () => {
        expect(await hdEP.getPayport(1)).toStrictEqual({
          address: FROM_ADDRESS.toLowerCase(),
        })
      })
    })

    describe('getPrivateKey', () => {
      test('returns prv', async () => {
        expect(await hdEP.getPrivateKey(0)).toBe(INSTANCE_KEYS.keys.prv)
      })
    })
  })
})
