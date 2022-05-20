import nock from 'nock'
import { RequestBodyMatcher } from 'nock/types'
import { MIN_CONFIRMATIONS } from '../../src'

interface Mock {
  req: RequestBodyMatcher
  res: Object
}

export function getNextNonceMocks(id: number | RegExp, address: string, nonce: string): Mock {
  return {
    req: getNextNonceRequest(id, address),
    res: getNextNonceResponse(id, nonce),
  }
}

export function getBalanceMocks(id: number | RegExp, address: string, balance: string): Mock {
  return {
    req: getBalanceRequest(id, address),
    res: getBalanceResponse(id, balance),
  }
}

export function getTransactionCountMocks(id: number | RegExp, address: string, nonce: string): Mock {
  return {
    req: getTransactionCountRequest(id, address),
    res: getTransactionCountResponse(id, nonce),
  }
}

export function getSendRawTransactionMocks(id: number | RegExp, rawTx: string, txHash: string): Mock {
  return {
    req: getSendRawTransactionRequest(id, rawTx),
    res: getSendRawTransactionResponse(id, txHash),
  }
}

export function getTransactionReceiptMocks(
  id: number | RegExp,
  from: string,
  to: string,
  status: number,
  blockNumber: string | null,
  txHash: string,
  blockHash: string | null,
  isConfirmed: boolean,
): Mock {
  return {
    req: getTransactionReceiptRequest(id, txHash),
    res: getTransactionReceiptResponse(id, from, to, status, blockNumber, txHash, blockHash, isConfirmed),
  }
}

export function getTransactionByHashMocks(
  id: number | RegExp,
  txHash: string,
  blockHash: string | null,
  blockNumber: number | null,
  from: string,
  to: string,
  value: string,
  isConfirmed: boolean,
): Mock {
  return {
    req: getTransactionByHashRequest(id, txHash),
    res: getTransactionByHashResponse(id, txHash, blockHash, blockNumber, from, to, value, isConfirmed),
  }
}

export function getBlockNumberMocks(id: number | RegExp, count: string, isSufficientlyConfirmed: boolean): Mock {
  return {
    req: getBlockNumberRequest(id),
    res: getBlockNumberResponse(id, count, isSufficientlyConfirmed),
  }
}

export function getBlockByNumberMocks(
  id: number | RegExp,
  blockNumber: string,
  blockHash: string,
  txHashes: [string],
): Mock {
  return {
    req: getBlockByNumberRequest(id, blockNumber),
    res: getBlockByNumberResponse(id, blockNumber, blockHash, txHashes),
  }
}

export function getBlockByHashMocks(
  id: number | RegExp,
  blockNumber: string,
  blockHash: string,
  txHashes: [string],
  isConfirmed: boolean,
): Mock {
  return {
    req: getBlockByHashRequest(id, blockHash),
    res: getBlockByHashResponse(id, blockNumber, blockHash, txHashes, isConfirmed),
  }
}

export function getGasStationResponse(): Object {
  return {
    fast: 80,
    fastest: 100,
    safeLow: 10,
    average: 30,
    block_time: 14.422222222222222,
    blockNum: 9232596,
    speed: 0.6487309843669901,
    safeLowWait: 9.5,
    avgWait: 3.3,
    fastWait: 0.5,
    fastestWait: 0.5,
    gasPriceRange: {
      100: 0.5,
      95: 0.5,
      90: 0.5,
      85: 0.5,
      80: 0.5,
      75: 0.8,
      70: 0.8,
      65: 0.8,
      60: 0.9,
      55: 1,
      50: 1,
      45: 3.1,
      40: 3.1,
      35: 3.1,
      30: 3.3,
      25: 4.6,
      20: 4.6,
      15: 7.8,
      10: 9.5,
      8: 240.4,
      6: 240.4,
      4: 240.4,
    },
  }
}

export function getGasPriceMocks(id: number | RegExp, price: string) {
  return {
    req: {
      jsonrpc: '2.0',
      id,
      method: 'eth_gasPrice',
      params: [],
    },
    res: {
      jsonrpc: '2.0',
      id,
      result: price,
    },
  }
}

export function getEstimateGasMocks(id: number | RegExp, from: string, to: string, result: string) {
  return {
    req: {
      jsonrpc: '2.0',
      id,
      method: 'eth_estimateGas',
      params: [
        {
          from: from.toLowerCase(),
          to: to.toLowerCase(),
        },
      ],
    },
    res: {
      jsonrpc: '2.0',
      id,
      result,
    },
  }
}
function getNextNonceRequest(id: number | RegExp, address: string): RequestBodyMatcher {
  return {
    jsonrpc: '2.0',
    method: 'parity_nextNonce',
    params: [address.toLowerCase()],
    id,
  }
}

function getNextNonceResponse(id: number | RegExp, nonce: string): Object {
  return {
    jsonrpc: '2.0',
    id,
    result: nonce,
  }
}

function getBalanceRequest(id: number | RegExp, address: string): RequestBodyMatcher {
  return {
    jsonrpc: '2.0',
    id,
    method: 'eth_getBalance',
    params: [address.toLowerCase(), 'latest'],
  }
}

function getBalanceResponse(id: number | RegExp, balance: string): Object {
  return {
    jsonrpc: '2.0',
    id,
    result: balance,
  }
}

function getTransactionCountRequest(id: number | RegExp, address: string): RequestBodyMatcher {
  return {
    jsonrpc: '2.0',
    method: 'eth_getTransactionCount',
    params: [address.toLowerCase(), 'pending'],
    id,
  }
}

function getTransactionCountResponse(id: number | RegExp, nonce: string): Object {
  return {
    jsonrpc: '2.0',
    id,
    result: nonce,
  }
}

function getSendRawTransactionRequest(id: number | RegExp, rawTx: string): RequestBodyMatcher {
  return {
    jsonrpc: '2.0',
    method: 'eth_sendRawTransaction',
    params: [rawTx],
    id,
  }
}

function getSendRawTransactionResponse(id: number | RegExp, txHash: string): Object {
  return {
    jsonrpc: '2.0',
    id,
    result: txHash,
  }
}

function getTransactionReceiptRequest(id: number | RegExp, txHash: string): RequestBodyMatcher {
  return {
    jsonrpc: '2.0',
    id,
    method: 'eth_getTransactionReceipt',
    params: [txHash],
  }
}

function getTransactionReceiptResponse(
  id: number | RegExp,
  from: string,
  to: string,
  status: number,
  blockNumber: string | null,
  txHash: string,
  blockHash: string | null,
  isConfirmed: boolean,
): Object {
  return {
    jsonrpc: '2.0',
    id,
    result: {
      from,
      to,
      transactionHash: txHash,
      transactionIndex: 0,
      blockHash,
      blockNumber: isConfirmed ? blockNumber : null,
      contractAddress: null,
      cumulativeGasUsed: 314159,
      gasUsed: 21000,
      logs: [],
      status,
    },
  }
}

function getTransactionByHashRequest(id: number | RegExp, txHash: string): RequestBodyMatcher {
  return {
    jsonrpc: '2.0',
    id,
    method: 'eth_getTransactionByHash',
    params: [txHash],
  }
}

function getTransactionByHashResponse(
  id: number | RegExp,
  txHash: string,
  blockHash: string | null,
  blockNumber: number | null,
  from: string,
  to: string,
  value: string,
  isConfirmed: boolean,
): Object {
  return {
    jsonrpc: '2.0',
    id,
    result: {
      hash: txHash,
      nonce: 2,
      blockHash,
      blockNumber: isConfirmed ? blockNumber : null,
      transactionIndex: 0,
      from,
      to,
      value,
      gas: 21000,
      gasPrice: '2000000000000',
      input: '0x57cb2fc4',
    },
  }
}

function getBlockNumberRequest(id: number | RegExp): RequestBodyMatcher {
  return {
    jsonrpc: '2.0',
    id,
    method: 'eth_blockNumber',
    params: [],
  }
}

function getBlockNumberResponse(id: number | RegExp, count: string, isSufficientlyConfirmed: boolean = false): Object {
  const result = isSufficientlyConfirmed ? getBlockNumberWithSufficientConfirmations(count) : count

  return {
    jsonrpc: '2.0',
    id,
    result,
  }
}

function getBlockByNumberRequest(id: number | RegExp, blockNumber: string): RequestBodyMatcher {
  return {
    jsonrpc: '2.0',
    id,
    method: 'eth_getBlockByNumber',
    params: [blockNumber, false],
  }
}

function getBlockByNumberResponse(
  id: number | RegExp,
  blockNumber: string,
  blockHash: string,
  txHashes: [string],
): Object {
  return {
    jsonrpc: '2.0',
    id,
    result: {
      number: 3,
      hash: blockHash,
      parentHash: '0x2302e1c0b972d00932deb5dab9eb2982f570597d9d42504c05d9c2147eaf9c88',
      nonce: '0xfb6e1a62d119228b',
      sha3Uncles: '0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347',
      logsBloom:
        '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
      transactionsRoot: '0x3a1b03875115b79539e5bd33fb00d8f7b7cd61929d5a3c574f507b8acf415bee',
      stateRoot: '0xf1133199d44695dfa8fd1bcfe424d82854b5cebef75bddd7e40ea94cda515bcb',
      miner: '0x8888f1f195afa192cfee860698584c030f4c9db1',
      difficulty: '21345678965432',
      totalDifficulty: '324567845321',
      size: 616,
      extraData: '0x',
      gasLimit: 3141592,
      gasUsed: 21000,
      timestamp: 1429287689,
      transactions: txHashes,
      uncles: [],
    },
  }
}

function getBlockByHashRequest(id: number | RegExp, blockHash: string): RequestBodyMatcher {
  return {
    jsonrpc: '2.0',
    id,
    method: 'eth_getBlockByHash',
    params: [blockHash, true],
  }
}

function getBlockByHashResponse(
  id: number | RegExp,
  blockNumber: string,
  blockHash: string,
  txHashes: string[],
  isConfirmed: boolean,
): Object {
  return {
    jsonrpc: '2.0',
    id,
    result: {
      number: isConfirmed ? blockNumber : null,
      hash: blockHash,
      parentHash: '0x2302e1c0b972d00932deb5dab9eb2982f570597d9d42504c05d9c2147eaf9c88',
      nonce: '0xfb6e1a62d119228b',
      sha3Uncles: '0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347',
      logsBloom:
        '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
      transactionsRoot: '0x3a1b03875115b79539e5bd33fb00d8f7b7cd61929d5a3c574f507b8acf415bee',
      stateRoot: '0xf1133199d44695dfa8fd1bcfe424d82854b5cebef75bddd7e40ea94cda515bcb',
      miner: '0x8888f1f195afa192cfee860698584c030f4c9db1',
      difficulty: '21345678965432',
      totalDifficulty: '324567845321',
      size: 616,
      extraData: '0x',
      gasLimit: 3141592,
      gasUsed: 21000,
      timestamp: isConfirmed ? 1429287689 : null,
      transactions: txHashes,
      uncles: [],
    },
  }
}

const getBlockNumberWithSufficientConfirmations = (blockNumber: string | number) => {
  const result = Math.max(MIN_CONFIRMATIONS, 12) + Number(blockNumber)

  return `0x${result.toString(16)}`
}

export const getTransactionApisMocks = ({
  requestId,
  nock,
  txId,
  blockId,
  blockNumber,
  amount,
  fromAddress,
  toAddress,
  isConfirmed = true,
  isFailedTransaction,
}: {
  requestId: number
  nock: nock.Scope
  txId: string
  blockId: string
  blockNumber: string
  amount: string
  fromAddress: string
  toAddress: string
  isConfirmed: boolean
  isFailedTransaction: boolean
}) => {
  let id = requestId
  const status = isFailedTransaction ? 0x0 : 0x1

  const transactionByHashMock = getTransactionByHashMocks(
    id++,
    txId,
    blockId,
    Number(blockNumber),
    fromAddress,
    toAddress,
    amount,
    isConfirmed,
  )
  nock.post(/.*/, transactionByHashMock.req).reply(200, transactionByHashMock.res)

  const mockTransactionReceipt = getTransactionReceiptMocks(
    id++,
    fromAddress,
    toAddress,
    status,
    blockNumber,
    txId,
    blockId,
    isConfirmed,
  )
  nock.post(/.*/, mockTransactionReceipt.req).reply(200, mockTransactionReceipt.res)

  const blockNumberNock = getBlockNumberMocks(id++, blockNumber, isConfirmed)
  nock.post(/.*/, blockNumberNock.req).reply(200, blockNumberNock.res)

  const blockNock = getBlockByHashMocks(id++, blockNumber, blockId, [txId], isConfirmed)

  nock.post(/.*/, blockNock.req).reply(200, blockNock.res)

  const blockNumberNock2 = getBlockNumberMocks(id++, blockNumber, isConfirmed)
  nock.post(/.*/, blockNumberNock2.req).reply(200, blockNumberNock2.res)

  const mockTransactionReceipt2 = getTransactionReceiptMocks(
    id++,
    fromAddress,
    toAddress,
    status,
    blockNumber,
    txId,
    blockId,
    isConfirmed,
  )
  nock.post(/.*/, mockTransactionReceipt2.req).reply(200, mockTransactionReceipt2.res)

  const blockNumberNock3 = getBlockNumberMocks(id++, blockNumber, isConfirmed)
  nock.post(/.*/, blockNumberNock3.req).reply(200, blockNumberNock3.res)

  return id
}
