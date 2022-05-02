import { NormalizedTxEthereum, SpecificTxEthereum } from 'blockbook-client'
import { Transaction, TransactionReceipt } from 'web3-eth'

import { NETWORK_DATA_PROVIDERS } from './constants'

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
}
