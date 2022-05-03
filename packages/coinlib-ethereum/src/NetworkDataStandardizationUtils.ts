import { BlockInfo } from '@bitaccess/coinlib-common'
import { BlockInfoEthereum, NormalizedTxEthereum, SpecificTxEthereum } from 'blockbook-client'
import { get } from 'lodash'
import { Transaction, TransactionReceipt } from 'web3-eth'
import { BlockTransactionObject } from 'web3-eth'

import { NETWORK_DATA_PROVIDERS } from './constants'
import { NetworkDataWeb3 } from './NetworkDataWeb3'

import { EthereumStandardizedERC20Transaction, EthereumStandardizedTransaction } from './types'

export class NetworkDataStandardizationUtils {
  standardizeBlockBookTransaction(tx: NormalizedTxEthereum, blockInfoTime?: Date): EthereumStandardizedTransaction {
    if (tx.vin.length !== 1 || tx.vout.length !== 1) {
      throw new Error('transaction has less or more than one input or output')
    }

    const inputAddresses = tx.vin[0].addresses
    const outputAddresses = tx.vout[0].addresses

    if (!inputAddresses || !outputAddresses) {
      throw new Error('transaction is missing from or to address')
    }

    const blockTime = blockInfoTime ? new Date(blockInfoTime) : new Date(tx.blockTime * 1000)

    const standardizedTransaction: EthereumStandardizedTransaction = {
      blockHash: tx.blockHash!,
      blockHeight: tx.blockHeight,
      blockTime,
      from: inputAddresses[0],
      nonce: tx.ethereumSpecific.nonce,
      to: outputAddresses[0],
      txHash: tx.txid,
      value: tx.value,
      confirmations: tx.confirmations,
      gasUsed: tx.ethereumSpecific.gasUsed,
      gasPrice: tx.ethereumSpecific.gasPrice,
      raw: {
        ...tx,
        provider: NETWORK_DATA_PROVIDERS.BLOCKBOOK,
      },
    }

    return standardizedTransaction
  }

  standardizeInfuraTransaction(
    tx: Transaction,
    {
      blockTime,
      currentBlockNumber,
      gasUsed,
    }: {
      blockTime: Date
      currentBlockNumber: number
      gasUsed: number
    },
  ): EthereumStandardizedTransaction {
    const standardizedTransaction: EthereumStandardizedTransaction = {
      from: tx.from,
      to: tx.to!,
      blockHash: tx.blockHash!,
      blockHeight: tx.blockNumber!,
      blockTime,
      nonce: tx.nonce,
      txHash: tx.hash,
      value: tx.value,
      gasUsed,
      gasPrice: tx.gasPrice,
      confirmations: currentBlockNumber - tx.blockNumber!,
      raw: {
        ...tx,
        blockTime,
        currentBlockNumber,
        gasUsed,
        provider: NETWORK_DATA_PROVIDERS.INFURA,
      },
    }

    return standardizedTransaction
  }

  standardizeBlockbookERC20Transaction({
    tx,
    txSpecific,
    tokenSymbol,
    tokenDecimals,
    tokenName,
  }: {
    tx: NormalizedTxEthereum
    txSpecific: SpecificTxEthereum
    tokenSymbol: string
    tokenDecimals: string
    tokenName: string
  }): EthereumStandardizedERC20Transaction {
    const standardizedTx = this.standardizeBlockBookTransaction(tx)

    const result: EthereumStandardizedERC20Transaction = {
      ...standardizedTx,
      raw: {
        ...standardizedTx.raw,
        ...txSpecific,
      },
      txInput: txSpecific.tx.input,
      tokenSymbol,
      tokenDecimals,
      tokenName,
      receipt: {
        ...txSpecific.receipt,
      },
    }

    return result
  }

  standardizeInfuraERC20Transaction(
    {
      tx,
      txReceipt,
    }: {
      tx: Transaction
      txReceipt: TransactionReceipt
    },
    {
      blockTime,
      currentBlockNumber,
      tokenDecimals,
      tokenName,
      tokenSymbol,
    }: { blockTime: Date; currentBlockNumber: number; tokenDecimals: string; tokenName: string; tokenSymbol: string },
  ): EthereumStandardizedERC20Transaction {
    const standardizedTx = this.standardizeInfuraTransaction(tx, {
      gasUsed: txReceipt.gasUsed,
      currentBlockNumber,
      blockTime,
    })

    const result: EthereumStandardizedERC20Transaction = {
      ...standardizedTx,
      txInput: tx.input,
      tokenSymbol,
      tokenDecimals,
      tokenName,
      receipt: {
        gasUsed: txReceipt.gasUsed.toString(),
        logs: txReceipt.logs,
        status: txReceipt.status,
      },
    }

    return result
  }

  async standardizeBlockInfoRaw(blockInfo: BlockInfo, web3Service: NetworkDataWeb3) {
    if (!blockInfo.raw) {
      return
    }

    const dataProvider: string = get(blockInfo.raw, 'dataProvider')

    if (dataProvider === NETWORK_DATA_PROVIDERS.BLOCKBOOK) {
      const blockRaw = blockInfo.raw as BlockInfoEthereum
      const blockTime = new Date(blockInfo.time)

      const standardizedTransactions = (blockRaw.txs ?? []).map((tx: NormalizedTxEthereum) =>
        this.standardizeBlockBookTransaction(tx, blockTime),
      )

      return {
        ...blockRaw,
        transactions: standardizedTransactions,
      }
    }

    if (dataProvider === NETWORK_DATA_PROVIDERS.INFURA) {
      const blockRaw = blockInfo.raw as BlockTransactionObject
      const currentBlockNumber = await web3Service.getCurrentBlockNumber()

      const standardizedTransactionsPromise = blockRaw.transactions.map(async tx => {
        const txReceipt = await web3Service.getTransactionReceipt(tx.hash)

        return this.standardizeInfuraTransaction(tx, {
          blockTime: blockInfo.time,
          gasUsed: txReceipt.gasUsed,
          currentBlockNumber,
        })
      })

      const standardizedTransactions = await Promise.all(standardizedTransactionsPromise)

      return {
        ...blockRaw,
        transactions: standardizedTransactions,
      }
    }

    return blockInfo.raw
  }
}
