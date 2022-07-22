import { Transaction } from 'web3-eth'

import { MIN_CONFIRMATIONS } from '../../src'
import { TestWeb3Provider } from './TestWeb3Provider'
import { Mock, MockReq, MockRes } from './types'

export function getParityNextNonceMocks(address: string, nonce: string): Mock {
  return {
    req: getParityNextNonceRequest(address),
    res: getParityNextNonceResponse(nonce),
  }
}

export function getBalanceMocks(address: string, balance: string): Mock {
  return {
    req: getBalanceRequest(address),
    res: getBalanceResponse(balance),
  }
}

export function getTransactionCountMocks(address: string, nonce: string): Mock {
  return {
    req: getTransactionCountRequest(address),
    res: getTransactionCountResponse(nonce),
  }
}

export function getSendRawTransactionMocks(rawTx: string, txHash: string): Mock {
  return {
    req: getSendRawTransactionRequest(rawTx),
    res: getSendRawTransactionResponse(txHash),
  }
}

export function getTransactionReceiptMocks(
  from: string,
  to: string,
  status: number,
  blockNumber: string | null,
  txHash: string,
  blockHash: string | null,
  isConfirmed: boolean,
): Mock {
  return {
    req: getTransactionReceiptRequest(txHash),
    res: getTransactionReceiptResponse(from, to, status, blockNumber, txHash, blockHash, isConfirmed),
  }
}

export function getTransactionByHashMocks(
  txHash: string,
  blockHash: string | null,
  blockNumber: number | null,
  from: string,
  to: string,
  value: string,
  isConfirmed: boolean,
): Mock {
  return {
    req: getTransactionByHashRequest(txHash),
    res: getTransactionByHashResponse(txHash, blockHash, blockNumber, from, to, value, isConfirmed),
  }
}

export function getBlockNumberMocks(count: string, isSufficientlyConfirmed: boolean): Mock {
  return {
    req: getBlockNumberRequest(),
    res: getBlockNumberResponse(count, isSufficientlyConfirmed),
  }
}

export function getBlockByNumberMocks(
  blockNumber: number,
  blockHash: string,
  txHashes: [string],
): Mock {
  return {
    req: getBlockByNumberRequest(blockNumber),
    res: getBlockByNumberResponse(blockNumber, blockHash, txHashes),
  }
}

export function getBlockByHashMocks(
  blockNumber: string,
  blockHash: string,
  txHashes: [string],
  isConfirmed: boolean,
): Mock {
  return {
    req: getBlockByHashRequest(blockHash),
    res: getBlockByHashResponse(blockNumber, blockHash, txHashes, isConfirmed),
  }
}

export function getGasStationResponse() {
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

export function getGasPriceMocks(price: string) {
  return {
    req: {
      method: 'eth_gasPrice',
      params: [],
    },
    res: {
      result: price,
    },
  }
}

export function getEstimateGasMocks(from: string, to: string, result: string, data?: string) {
  return {
    req: {
      method: 'eth_estimateGas',
      params: [
        {
          from: from.toLowerCase(),
          to: to.toLowerCase(),
          ...(data ? { data } : {}),
        },
      ],
    },
    res: {
      result,
    },
  }
}
function getParityNextNonceRequest(address: string): MockReq {
  return {
    method: 'parity_nextNonce',
    params: [address.toLowerCase()],
  }
}

function getParityNextNonceResponse(nonce: string): MockRes {
  return {
    result: nonce,
  }
}

function getBalanceRequest(address: string): MockReq {
  return {
    method: 'eth_getBalance',
    params: [address.toLowerCase(), 'latest'],
  }
}

function getBalanceResponse(balance: string): MockRes {
  return {
    result: balance,
  }
}

function getTransactionCountRequest(address: string): MockReq {
  return {
    method: 'eth_getTransactionCount',
    params: [address.toLowerCase(), 'pending'],
  }
}

function getTransactionCountResponse(nonce: string): MockRes<string> {
  return {
    result: nonce,
  }
}

function getSendRawTransactionRequest(rawTx: string): MockReq {
  return {
    method: 'eth_sendRawTransaction',
    params: [rawTx],
  }
}

function getSendRawTransactionResponse(txHash: string): MockRes<string> {
  return {
    result: txHash,
  }
}

function getTransactionReceiptRequest(txHash: string): MockReq {
  return {
    method: 'eth_getTransactionReceipt',
    params: [txHash],
  }
}

function getTransactionReceiptResponse(
  from: string,
  to: string,
  status: number,
  blockNumber: string | null,
  txHash: string,
  blockHash: string | null,
  isConfirmed: boolean,
): MockRes {
  return {
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

function getTransactionByHashRequest(txHash: string): MockReq {
  return {
    method: 'eth_getTransactionByHash',
    params: [txHash],
  }
}

function getTransactionByHashResponse(
  txHash: string,
  blockHash: string | null,
  blockNumber: number | null,
  from: string,
  to: string,
  value: string,
  isConfirmed: boolean,
): MockRes<Transaction> {
  return {
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

function getBlockNumberRequest(): MockReq {
  return {
    method: 'eth_blockNumber',
    params: [],
  }
}

function getBlockNumberResponse(count: string, isSufficientlyConfirmed: boolean = false): MockRes<string> {
  const result = isSufficientlyConfirmed ? getBlockNumberWithSufficientConfirmations(count) : count

  return {
    result,
  }
}

function getBlockByNumberRequest(blockNumber: number): MockReq {
  return {
    method: 'eth_getBlockByNumber',
    params: [String(blockNumber), false],
  }
}

function getBlockByNumberResponse(
  blockNumber: number,
  blockHash: string,
  txHashes: [string],
): MockRes {
  return {
    result: {
      number: blockNumber,
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

function getBlockByHashRequest(blockHash: string): MockReq {
  return {
    method: 'eth_getBlockByHash',
    params: [blockHash, false],
  }
}

function getBlockByHashResponse(
  blockNumber: string,
  blockHash: string,
  txHashes: string[],
  isConfirmed: boolean,
): MockRes {
  return {
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

export const addTransactionApisMocks = ({
  testProvider,
  txId,
  blockId,
  blockNumber,
  amount,
  fromAddress,
  toAddress,
  isConfirmed = true,
  isFailedTransaction,
}: {
  testProvider: TestWeb3Provider,
  txId: string
  blockId: string
  blockNumber: string
  amount: string
  fromAddress: string
  toAddress: string
  isConfirmed: boolean
  isFailedTransaction: boolean
}) => {
  const id = /\d+/
  const status = isFailedTransaction ? 0x0 : 0x1

  testProvider.addMock(getTransactionByHashMocks(
    txId,
    blockId,
    Number(blockNumber),
    fromAddress,
    toAddress,
    amount,
    isConfirmed,
  ))

  testProvider.addMock(getTransactionReceiptMocks(
    fromAddress,
    toAddress,
    status,
    blockNumber,
    txId,
    blockId,
    isConfirmed,
  ))

  testProvider.addMock(getBlockNumberMocks(blockNumber, isConfirmed))

  testProvider.addMock(getBlockByHashMocks(blockNumber, blockId, [txId], isConfirmed))

  return id
}

export const BLOCKBOOK_STATUS_MOCK = {
  "blockbook": {
    "coin": "Ethereum",
    "host": "blockbook-host",
    "version": "0.3.6",
    "gitCommit": "2002bd2",
    "buildTime": "2022-07-04T14:21:45+00:00",
    "syncMode": true,
    "initialSync": false,
    "inSync": true,
    "bestHeight": 15136912,
    "lastBlockTime": "2022-07-13T22:22:15.828026078Z",
    "inSyncMempool": true,
    "lastMempoolTime": "2022-07-13T22:22:37.583643591Z",
    "mempoolSize": 418174,
    "decimals": 18,
    "dbSize": 194533397963,
    "about": "Blockbook - blockchain indexer"
  },
  "backend": {
    "chain": "mainnet",
    "blocks": 15136912,
    "bestBlockHash": "0x6fff5cb18e42375abec0d7ab83540481699d5edaf4ca2048ae452b36c9584aca",
    "difficulty": "11213687248219436",
    "version": "Geth/v1.10.19-stable-23bee162/linux-amd64/go1.18.1"
  }
}

export function getBlockbookAddressBasicMock(from: string, nonce: number) {
  return {
    address: from,
    balance: "0",
    unconfirmedBalance: "0",
    unconfirmedTxs: 0,
    txs: nonce + 4,
    nonTokenTxs: nonce + 2,
    nonce: String(nonce)
  }
}
