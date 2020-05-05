import { NetworkData } from '../src/NetworkData'

const nock = require('nock')
import { hdAccount } from './fixtures/accounts'

import {
  getEstimateGasMocks,
  getGasPriceMocks,
  getGasStationResponse,
  getNextNonceMocks,
  getBalanceMocks,
  getTransactionCountMocks,
  getSendRawTransactionMocks,
  getTransactionReceiptMocks,
  getTransactionByHashMocks,
  getBlockByNumberMocks,
  getBlockNumberMocks,
} from './fixtures/mocks'

describe('NetworkData', () => {
  const GAS_STATION_URL = 'https://gasstation.test.url'
  const PARITY_URL = 'https://parity.test.url'
  const INFURA_URL = 'https://infura.test.url'

  const nockG = nock(GAS_STATION_URL)
  const nockP = nock(PARITY_URL)
  const nockI = nock(INFURA_URL)

  const Web3 = require('web3')
  const web3 = new Web3()

  const from = web3.eth.accounts.create().address
  const to = web3.eth.accounts.create().address

  test('getNetworkData default flow', async () => {
    const networkData = new NetworkData(GAS_STATION_URL, PARITY_URL, INFURA_URL)

    nockG.get('/json/ethgasAPI.json').reply(200, getGasStationResponse())

    const transactionCountMocks = getTransactionCountMocks(1, from.toLowerCase(), '0x1a')
    nockI.post(/.*/, transactionCountMocks.req).reply(200, transactionCountMocks.res)

    const parityMock = getNextNonceMocks(1, from, '0x1b')
    nockP.post(/.*/, parityMock.req).reply(200, parityMock.res)

    const res = await networkData.getNetworkData('ETHEREUM_TRANSFER', from, to, 'SLOW')

    expect(res).toEqual({
      'pricePerGasUnit': '1000000000',
      'amountOfGas': '21000',
      'nonce': '27',
    })
  })

  test('getNetworkData fallback to defaults', async () => {
    const networkData = new NetworkData(GAS_STATION_URL, PARITY_URL, INFURA_URL)

    // fail
    nockG.get('/json/ethgasAPI.json').reply(400)

    let transactionCountMocks = getTransactionCountMocks(1, from.toLowerCase(), '')
    nockI.post(/.*/, transactionCountMocks.req).reply(200, transactionCountMocks.res)

    let gasPriceMock = getGasPriceMocks(2, '')
    nockI.post(/.*/, gasPriceMock.req).reply(200, gasPriceMock.res)

    transactionCountMocks = getTransactionCountMocks(3, from.toLowerCase(), '')
    nockI.post(/.*/, transactionCountMocks.req).reply(200, transactionCountMocks.res)

    let estimateGasPriceMock = getEstimateGasMocks(4, from.toLowerCase(), to.toLowerCase(), '')
    nockI.post(/.*/, estimateGasPriceMock.res).reply(200, estimateGasPriceMock.req)

    const parityMock = getNextNonceMocks(1, from, '')
    nockP.post(/.*/, parityMock.req).reply(200, parityMock.res)

    const res = await networkData.getNetworkData('RANDOM_ACTION', from, to, 'SLOW')

    expect(res).toEqual({
      'pricePerGasUnit': '50000000000',
      'amountOfGas': '50000',
      'nonce': '0',
    })
  })

  test('getNetworkData empty responses', async () => {
    const networkData = new NetworkData(GAS_STATION_URL, PARITY_URL, INFURA_URL)

    // fail
    nockG.get('/json/ethgasAPI.json').reply(200, {
    })

    let transactionCountMocks = getTransactionCountMocks(1, from.toLowerCase(), '')
    nockI.post(/.*/, transactionCountMocks.req).reply(400)

    let gasPriceMock = getGasPriceMocks(2, '')
    nockI.post(/.*/, gasPriceMock.req).reply(200, gasPriceMock.res)

    transactionCountMocks = getTransactionCountMocks(3, from.toLowerCase(), '')
    nockI.post(/.*/, transactionCountMocks.req).reply(200, transactionCountMocks.res)

    let estimateGasPriceMock = getEstimateGasMocks(4, from.toLowerCase(), to.toLowerCase(), '')
    nockI.post(/.*/, estimateGasPriceMock.res).reply(200, estimateGasPriceMock.req)

    const parityMock = getNextNonceMocks(1, from, '0x1b')
    nockP.post(/.*/, parityMock.req).reply(400)

    const res = await networkData.getNetworkData('RANDOM_ACTION', from, to, 'SLOW')

    expect(res).toEqual({
      'pricePerGasUnit': '50000000000',
      'amountOfGas': '50000',
      'nonce': '0',
    })
  })
})
