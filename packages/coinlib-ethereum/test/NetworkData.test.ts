import { NetworkData } from '../src/NetworkData'
import {
  getEstimateGasMocks,
  getGasPriceMocks,
  getGasStationResponse,
  getNextNonceMocks,
  getTransactionCountMocks,
} from './fixtures/mocks'
import { FeeLevel } from '@bitaccess/coinlib-common'
import { TestLogger } from '../../../common/testUtils'
import nock from 'nock'
import Web3 from 'web3'

const logger = new TestLogger('ethereum-payments.NetworkData')

let id = 1

describe('NetworkData', () => {
  const GAS_STATION_URL = 'https://gasstation.test.url'
  const PARITY_URL = 'https://parity.test.url'
  const INFURA_URL = 'https://infura.test.url'
  const BLOCKBOOK_NODES = ['<YOUR_BLOCKBOOK_NODE_HERE>']

  const nockG = nock(GAS_STATION_URL)
  const nockP = nock(PARITY_URL)
  const nockI = nock(INFURA_URL)

  const web3 = new Web3(INFURA_URL)

  const from = web3.eth.accounts.create().address.toLowerCase()
  const to = web3.eth.accounts.create().address.toLowerCase()

  const networkDataConfig = {
    web3: {
      eth: web3.eth,
      gasStationUrl: GAS_STATION_URL,
    },
    parity: { parityUrl: PARITY_URL },
    blockBook: { nodes: BLOCKBOOK_NODES },
    logger,
  }

  const networkData = new NetworkData(networkDataConfig)

  test('getNetworkData default flow', async () => {
    nockG.get('/json/ethgasAPI.json').reply(200, getGasStationResponse())

    const transactionCountMocks = getTransactionCountMocks(id++, from, '0x1a')
    nockI.post(/.*/, transactionCountMocks.req).reply(200, transactionCountMocks.res)

    const estimateGasPriceMock = getEstimateGasMocks(id++, from, to, `0x${(21000).toString(16)}`)
    nockI.post(/.*/, estimateGasPriceMock.req).reply(200, estimateGasPriceMock.res)

    const parityMock = getNextNonceMocks(1, from, '0x1b')
    nockP.post(/.*/, parityMock.req).reply(200, parityMock.res)

    const res = await networkData.getNetworkData('ETHEREUM_TRANSFER', FeeLevel.Low, from, to)

    expect(res).toEqual({
      pricePerGasUnit: '1000000000',
      amountOfGas: 21000,
      nonce: '27',
    })
  })

  test('getNetworkData gas limit multiplier', async () => {
    nockG.get('/json/ethgasAPI.json').reply(200, getGasStationResponse())

    const transactionCountMocks = getTransactionCountMocks(id++, from, '0x1a')
    nockI.post(/.*/, transactionCountMocks.req).reply(200, transactionCountMocks.res)

    const estimateGasPriceMock = getEstimateGasMocks(id++, from, to, `0x${(32001).toString(16)}`)
    nockI.post(/.*/, estimateGasPriceMock.req).reply(200, estimateGasPriceMock.res)

    const parityMock = getNextNonceMocks(1, from, '0x1b')
    nockP.post(/.*/, parityMock.req).reply(200, parityMock.res)

    const res = await networkData.getNetworkData('TOKEN_SWEEP', FeeLevel.Low, from, to)

    expect(res).toEqual({
      pricePerGasUnit: '1000000000',
      amountOfGas: 48002,
      nonce: '27',
    })
  })

  test('getNetworkData fallback to defaults', async () => {
    // fail
    nockG.get('/json/ethgasAPI.json').reply(400)

    let transactionCountMocks = getTransactionCountMocks(id++, from, '')
    nockI.post(/.*/, transactionCountMocks.req).reply(200, transactionCountMocks.res)

    const gasPriceMock = getGasPriceMocks(id++, '')
    nockI.post(/.*/, gasPriceMock.req).reply(200, gasPriceMock.res)

    transactionCountMocks = getTransactionCountMocks(id++, from, '')
    nockI.post(/.*/, transactionCountMocks.req).reply(200, transactionCountMocks.res)

    const estimateGasPriceMock = getEstimateGasMocks(id++, from, to, '')
    nockI.post(/.*/, estimateGasPriceMock.req).reply(200, estimateGasPriceMock.res)

    const parityMock = getNextNonceMocks(1, from, '')
    nockP.post(/.*/, parityMock.req).reply(200, parityMock.res)

    const res = await networkData.getNetworkData('ETHEREUM_TRANSFER', FeeLevel.Low, from, to)

    expect(res).toEqual({
      pricePerGasUnit: '50000000000',
      amountOfGas: 50000,
      nonce: '0',
    })
  })

  test('getNetworkData empty responses', async () => {
    // fail
    nockG.get('/json/ethgasAPI.json').reply(200, {})

    let transactionCountMocks = getTransactionCountMocks(id++, from, '')
    nockI.post(/.*/, transactionCountMocks.req).reply(400)

    const gasPriceMock = getGasPriceMocks(id++, '')
    nockI.post(/.*/, gasPriceMock.req).reply(200, gasPriceMock.res)

    transactionCountMocks = getTransactionCountMocks(id++, from, '')
    nockI.post(/.*/, transactionCountMocks.req).reply(200, transactionCountMocks.res)

    const estimateGasPriceMock = getEstimateGasMocks(id++, from, to, '')
    nockI.post(/.*/, estimateGasPriceMock.req).reply(200, estimateGasPriceMock.res)

    const parityMock = getNextNonceMocks(1, from, '0x1b')
    nockP.post(/.*/, parityMock.req).reply(400)

    const res = await networkData.getNetworkData('ETHEREUM_TRANSFER', FeeLevel.Low, from, to)

    expect(res).toEqual({
      pricePerGasUnit: '50000000000',
      amountOfGas: 50000,
      nonce: '0',
    })
  })

  it.skip('should get a block details', async () => {
    const block = await networkData.getBlock(12046698)

    expect(block.txCount).toBe(block.txs?.length)
    expect(block).toBeDefined()
  })

  it.skip('should get an  address details', async () => {
    const address = '0x176366cfd97885245faea72f8cb6951e52655adf'
    const addressDetails = await networkData.getAddressDetails(address)

    expect(addressDetails).toBeDefined()
  })

  it.skip('should get a transaction', async () => {
    const txId = '0xe003f982a9f16235c0f30e31c0c85bc0fcab280fcc9e7ddd993faa043d0c1758'
    const tx = await networkData.getTransaction(txId)

    expect(tx).toBeDefined()
  })
})
