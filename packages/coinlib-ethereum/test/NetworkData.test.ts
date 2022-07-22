import { TestWeb3Provider } from './fixtures/TestWeb3Provider'
import { NetworkData } from '../src/NetworkData'
import { NetworkDataConfig, TOKEN_SWEEP_COST, ETHEREUM_TRANSFER_COST } from '../src'
import {
  BLOCKBOOK_STATUS_MOCK,
  getBlockbookAddressBasicMock,
  getBlockNumberMocks,
  getEstimateGasMocks,
  getGasPriceMocks,
  getGasStationResponse,
  getTransactionCountMocks,
} from './fixtures/mocks'
import { FeeLevel, numericToHex } from '@bitaccess/coinlib-common'
import { TestLogger } from '../../../common/testUtils'
import nock from 'nock'
import Web3 from 'web3'

const logger = new TestLogger(__filename)

const testWeb3Provider = new TestWeb3Provider(logger)

describe('NetworkData', () => {
  const GAS_STATION_URL = 'https://gasstation.test.local'
  const BLOCKBOOK_NODE = 'https://blockbook.test.local'

  const nockG = nock(GAS_STATION_URL)
  const nockB = nock(BLOCKBOOK_NODE)

  const web3 = new Web3(testWeb3Provider)

  const from = web3.eth.accounts.create().address.toLowerCase()
  const to = web3.eth.accounts.create().address.toLowerCase()

  const networkDataConfig: NetworkDataConfig = {
    web3Config: { web3 },
    blockBookConfig: { nodes: [BLOCKBOOK_NODE] },
    logger,
    gasStationUrl: GAS_STATION_URL,
  }

  const networkData = new NetworkData(networkDataConfig)

  describe('getGasAndNonceForNewTx', () => {
    it('succeeds for default flow', async () => {
      nockG.get('/json/ethgasAPI.json').reply(200, getGasStationResponse())

      testWeb3Provider.addMock(getTransactionCountMocks(from, numericToHex(27)))

      testWeb3Provider.addMock(getEstimateGasMocks(from, to, numericToHex(30000)))

      nockB.get(`/api/v2/address/${from}?details=basic`).reply(200, getBlockbookAddressBasicMock(from, 27))

      const res = await networkData.getGasAndNonceForNewTx('TOKEN_TRANSFER', FeeLevel.Low, from, to)

      expect(res).toEqual({
        pricePerGasUnit: '1000000000',
        amountOfGas: 45000,
        nonce: '27',
      })
    })

    it('falls back to defaults', async () => {
      // fail
      nockG.get('/json/ethgasAPI.json').reply(400)

      testWeb3Provider.addMock(getGasPriceMocks(''))

      testWeb3Provider.addMock(getTransactionCountMocks(from, ''))

      testWeb3Provider.addMock(getEstimateGasMocks(from, to, ''))

      nockB.get(`/api/v2/address/${from}?details=basic`).reply(400)

      const res = await networkData.getGasAndNonceForNewTx('ETHEREUM_TRANSFER', FeeLevel.Low, from, to)

      expect(res).toEqual({
        pricePerGasUnit: '50000000000',
        amountOfGas: ETHEREUM_TRANSFER_COST,
        nonce: '0',
      })
    })
  })

  describe('getNextNonce', () => {
    it('uses higher nonce from blockbook', async () => {
      testWeb3Provider.addMock(getTransactionCountMocks(from, numericToHex(27)))

      nockB.get(`/api/v2/address/${from}?details=basic`).reply(200, getBlockbookAddressBasicMock(from, 28))

      const res = await networkData.getNextNonce(from)
      expect(res).toBe('28')
    })

    it('uses higher nonce from web3', async () => {
      testWeb3Provider.addMock(getTransactionCountMocks(from, numericToHex(29)))

      nockB.get(`/api/v2/address/${from}?details=basic`).reply(200, getBlockbookAddressBasicMock(from, 28))

      const res = await networkData.getNextNonce(from)
      expect(res).toBe('29')
    })

    it('falls back to default', async () => {
      testWeb3Provider.addMock(getTransactionCountMocks(from, ''))

      nockB.get(`/api/v2/address/${from}?details=basic`).reply(400)

      const res = await networkData.getNextNonce(from)
      expect(res).toBe('0')
    })
  })

  describe('estimateGas', () => {
    it('applies multiplier', async () => {
      testWeb3Provider.addMock(getEstimateGasMocks(from, to, numericToHex(32000)))

      const res = await networkData.estimateGas({ from, to }, 'TOKEN_SWEEP')
      expect(res).toBe(48000)
    })
    it('falls back to default', async () => {
      testWeb3Provider.addMock(getEstimateGasMocks(from, to, ''))

      const res = await networkData.estimateGas({ from, to }, 'TOKEN_SWEEP')
      expect(res).toBe(TOKEN_SWEEP_COST)
    })
  })

  describe('getGasPrice', () => {
    it('uses gas station fast estimate', async () => {
      nockG.get('/json/ethgasAPI.json').reply(200, getGasStationResponse())

      const res = await networkData.getGasPrice(FeeLevel.High)
      expect(res).toBe('8000000000')
    })

    it('uses gas station average estimate', async () => {
      nockG.get('/json/ethgasAPI.json').reply(200, getGasStationResponse())

      const res = await networkData.getGasPrice(FeeLevel.Medium)
      expect(res).toBe('3000000000')
    })

    it('uses gas station safeLow estimate', async () => {
      nockG.get('/json/ethgasAPI.json').reply(200, getGasStationResponse())

      const res = await networkData.getGasPrice(FeeLevel.Low)
      expect(res).toBe('1000000000')
    })

    it('falls back to web3 estimate', async () => {
      // fail
      nockG.get('/json/ethgasAPI.json').reply(200, {})

      testWeb3Provider.addMock(getGasPriceMocks(numericToHex(7.7e9)))

      const res = await networkData.getGasPrice(FeeLevel.Medium)
      expect(res).toBe('7700000000')
    })
  })

  describe('getCurrentBlockNumber', () => {
    it('should get from blockbook', async () => {
      nockB.get('/api/v2').reply(200, BLOCKBOOK_STATUS_MOCK)

      const currentBlock = await networkData.getCurrentBlockNumber()
      expect(currentBlock).toBe(BLOCKBOOK_STATUS_MOCK.blockbook.bestHeight)
    })

    it('should fallback to web3', async () => {
      nockB.get('/api/v2').reply(400)

      testWeb3Provider.addMock(getBlockNumberMocks(numericToHex(123), false))

      const currentBlock = await networkData.getCurrentBlockNumber()
      expect(currentBlock).toBe(123)
    })
  })
})
