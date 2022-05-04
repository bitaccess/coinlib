import { BlockInfo } from '@bitaccess/coinlib-common'
import { Logger } from '@faast/ts-common'
import {
  BlockbookEthereum,
  BlockInfoEthereum,
  GetAddressDetailsOptions,
  NormalizedTxEthereum,
  SpecificTxEthereum,
} from 'blockbook-client'
import { NETWORK_DATA_PROVIDERS } from './constants'

import {
  EthereumBlockbookConnectedConfig,
  EthereumNetworkDataProvider,
  EthereumStandardizedERC20Transaction,
  EthereumStandardizedTransaction,
} from './types'
import { retryIfDisconnected, resolveServer } from './utils'

export class NetworkDataBlockbook implements EthereumNetworkDataProvider {
  private logger: Logger
  private api: BlockbookEthereum

  constructor(config: EthereumBlockbookConnectedConfig) {
    this.logger = config.logger
    const { api } = resolveServer(config, this.logger)
    this.api = api
  }

  async init(): Promise<void> {
    await this.api.connect()
  }

  async destroy(): Promise<void> {
    await this.api.disconnect()
  }

  getApi() {
    if (!this.api) {
      throw new Error('Blockbook api is not initialized')
    }

    return this.api
  }

  async getBlock(id?: string | number): Promise<BlockInfo> {
    const blockId = id ?? (await this.getCurrentBlockNumber())

    const block = await this._retryDced(() => this.api.getBlock(blockId))

    return this.standardizeBlock(block)
  }

  standardizeBlock(block: BlockInfoEthereum) {
    const blockTime = new Date(Number(block.time) * 1000)

    const standardizedTransactions = (block.txs ?? []).map((tx: NormalizedTxEthereum) =>
      this.standardizeTransaction(tx, blockTime),
    )

    if (!raw.time) {
      throw new Error(`ethereum block ${id ?? 'latest'} missing timestamp`)
    }

    const blockInfo: BlockInfo = {
      height: block.height,
      id: block.hash,
      previousId: block.previousBlockHash,
      time: blockTime,
      raw: {
        ...block,
        transactions: standardizedTransactions,
        dataProvider: NETWORK_DATA_PROVIDERS.BLOCKBOOK,
      },
    }

    return blockInfo
  }

  async getCurrentBlockNumber() {
    const bestBlock = await this._retryDced(() => this.api.getBestBlock())

    return bestBlock.height
  }

  async getTransaction(txId: string) {
    const tx = await this._retryDced(() => this.api.getTx(txId))

    return this.standardizeTransaction(tx)
  }

  async getAddressDetails(address: string, options?: GetAddressDetailsOptions) {
    return this._retryDced(() => this.api.getAddressDetails(address, options))
  }

  async getERC20Transaction(txId: string, tokenAddress: string) {
    const tx = await this._retryDced(() => this.api.getTx(txId))
    const txSpecific = await this._retryDced(() => this.api.getTxSpecific(txId))

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

    return this.standardizeERC20Transaction({
      tx,
      txSpecific,
      tokenSymbol: transferredToken.symbol,
      tokenDecimals: transferredToken.decimals.toString(),
      tokenName: transferredToken.name,
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

  standardizeTransaction(tx: NormalizedTxEthereum, blockInfoTime?: Date): EthereumStandardizedTransaction {
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
        dataProvider: NETWORK_DATA_PROVIDERS.BLOCKBOOK,
      },
    }

    return standardizedTransaction
  }

  standardizeERC20Transaction({
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
    const standardizedTx = this.standardizeTransaction(tx)

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

  async _retryDced<T>(fn: () => Promise<T>, additionalRetryableErrors?: string[]): Promise<T> {
    return retryIfDisconnected(fn, this.logger, additionalRetryableErrors)
  }
}
