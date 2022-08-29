import { BlockInfo } from '@bitaccess/coinlib-common'
import { Logger } from '@bitaccess/ts-common'
import {
  BlockbookEthereum,
  BlockInfoEthereum,
  GetAddressDetailsOptions,
  NormalizedTxEthereum,
  SpecificTxEthereum,
} from 'blockbook-client'

import {
  EthereumBlockbookConnectedConfig,
  EthereumNetworkDataProvider,
  EthereumStandardizedERC20Transaction,
  EthereumStandardizedTransaction,
  NetworkDataProviders,
} from './types'
import { retryIfDisconnected, resolveServer, getBlockBookTxFromAndToAddress, deriveCreate1Address } from './utils'

export class NetworkDataBlockbook implements EthereumNetworkDataProvider {
  private logger: Logger
  api: BlockbookEthereum | null
  server: string[] | null

  constructor(config: EthereumBlockbookConnectedConfig) {
    this.logger = config.logger
    const { api, server } = resolveServer(config, this.logger)
    this.api = api
    this.server = server
  }

  async init(): Promise<void> {
    await this.getApi().connect()
  }

  async destroy(): Promise<void> {
    await this.getApi().disconnect()
  }

  getApi() {
    if (!this.api) {
      throw new Error('Blockbook api is not initialized')
    }

    return this.api
  }

  async getBlock(id?: string | number, includeTransactionObjects: boolean = false): Promise<BlockInfo> {
    const currentBlockNumber = await this.getCurrentBlockNumber()
    const blockId = id ?? currentBlockNumber

    const block = await this._retryDced(() => this.getApi().getBlock(blockId))

    return this.standardizeBlock(block, includeTransactionObjects, currentBlockNumber)
  }

  standardizeBlock(
    block: BlockInfoEthereum,
    includeTransactionObjects: boolean,
    currentBlockNumber: number,
  ): BlockInfo {
    const blockInfoTime = new Date(Number(block.time) * 1000)

    const transactionHashes: string[] = []
    const standardizedTransactions: EthereumStandardizedTransaction[] = []
    for (const tx of block.txs ?? []) {
      transactionHashes.push(tx.txid)

      if (includeTransactionObjects) {
        standardizedTransactions.push(
          this.standardizeTransaction(tx, {
            blockInfoTime,
            currentBlockNumber,
          }),
        )
      }
    }

    const blockInfo: BlockInfo = {
      height: block.height,
      id: block.hash,
      previousId: block.previousBlockHash,
      time: blockInfoTime,
      raw: {
        ...block,
        transactions: standardizedTransactions,
        transactionHashes,
        dataProvider: NetworkDataProviders.Blockbook,
      },
    }

    return blockInfo
  }

  async getCurrentBlockNumber() {
    const bestBlock = await this._retryDced(() => this.getApi().getBestBlock())

    return bestBlock.height
  }

  async getTransaction(txId: string) {
    const tx = await this._retryDced(() => this.getApi().getTx(txId))
    const txSpecific = await this._retryDced(() => this.getApi().getTxSpecific(txId))
    const currentBlockNumber = await this.getCurrentBlockNumber()
    return this.standardizeTransaction(tx, { txSpecific, currentBlockNumber })
  }

  async getAddressDetails(address: string, options?: GetAddressDetailsOptions) {
    return this._retryDced(() => this.getApi().getAddressDetails(address, options))
  }

  async getNextNonce(address: string): Promise<string> {
    const addressDetails = await this.getAddressDetails(address, { details: 'basic' })
    return addressDetails.nonce
  }

  async getERC20Transaction(txId: string, tokenAddress: string) {
    const tx = await this._retryDced(() => this.getApi().getTx(txId))
    const txSpecific = await this._retryDced(() => this.getApi().getTxSpecific(txId))

    const tokenTransfers: NormalizedTxEthereum['tokenTransfers'] = tx.tokenTransfers ?? []

    if (tokenTransfers.length < 1) {
      throw new Error(`txId=${tx.txid} has no tokenTransfers`)
    }

    const transferredToken = tokenTransfers.find(
      transfer => transfer.token.toLowerCase() === tokenAddress.toLowerCase(),
    )

    if (!transferredToken) {
      throw new Error(`tx tokenTransfer does not contain token=${tokenAddress}`)
    }

    const currentBlockNumber = await this.getCurrentBlockNumber()

    return this.standardizeERC20Transaction({
      tx,
      txSpecific,
      tokenSymbol: transferredToken.symbol,
      tokenDecimals: transferredToken.decimals.toString(),
      tokenName: transferredToken.name,
      currentBlockNumber,
    })
  }

  async getAddressBalance(address: string) {
    const { balance } = await this.getAddressDetails(address)

    return balance
  }

  async getAddressBalanceERC20(address: string, tokenAddress: string) {
    const addressDetails = await this.getAddressDetails(address, { details: 'tokenBalances' })

    const token = (addressDetails.tokens ?? []).find(
      token => token.contract.toLowerCase() === tokenAddress.toLowerCase(),
    )

    if (!token) {
      throw new Error(`Failed to find tokenAddress=${tokenAddress} in tokens list`)
    }

    return token.balance!
  }

  standardizeTransaction(
    tx: NormalizedTxEthereum,
    {
      currentBlockNumber,
      blockInfoTime,
      txSpecific,
    }: {
      currentBlockNumber: number
      txSpecific?: SpecificTxEthereum
      blockInfoTime?: Date
    },
  ): EthereumStandardizedTransaction {
    const { fromAddress, toAddress, contractAddress } = getBlockBookTxFromAndToAddress(tx)

    const blockTime = blockInfoTime ? new Date(blockInfoTime) : new Date(tx.blockTime * 1000)

    const standardizedTransaction: EthereumStandardizedTransaction = {
      blockHash: tx.blockHash!,
      blockHeight: tx.blockHeight,
      blockTime,
      from: fromAddress,
      nonce: tx.ethereumSpecific.nonce,
      to: toAddress,
      txHash: tx.txid,
      value: tx.value,
      confirmations: tx.confirmations,
      gasUsed: tx.ethereumSpecific.gasUsed,
      gasPrice: tx.ethereumSpecific.gasPrice,
      status: Boolean(tx.ethereumSpecific.status),
      contractAddress,
      currentBlockNumber,
      dataProvider: NetworkDataProviders.Web3,
      receipt: txSpecific?.receipt,
      raw: {
        ...tx,
        ...txSpecific?.tx,
      },
      tokenTransfers: tx.tokenTransfers ?? [],
    }

    return standardizedTransaction
  }

  standardizeERC20Transaction({
    tx,
    txSpecific,
    tokenSymbol,
    tokenDecimals,
    tokenName,
    currentBlockNumber,
  }: {
    tx: NormalizedTxEthereum
    txSpecific: SpecificTxEthereum
    tokenSymbol: string
    tokenDecimals: string
    tokenName: string
    currentBlockNumber: number
  }): EthereumStandardizedERC20Transaction {
    const standardizedTx = this.standardizeTransaction(tx, { txSpecific, currentBlockNumber })

    const result: EthereumStandardizedERC20Transaction = {
      ...standardizedTx,
      txInput: txSpecific.tx.input,
      tokenSymbol,
      tokenDecimals,
      tokenName,
      receipt: txSpecific.receipt,
    }

    return result
  }

  async _retryDced<T>(fn: () => Promise<T>, additionalRetryableErrors?: string[]): Promise<T> {
    return retryIfDisconnected(fn, this.logger, additionalRetryableErrors)
  }
}
