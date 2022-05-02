import { BlockInfo, TransactionStatus } from '@bitaccess/coinlib-common'
import { Logger } from '@faast/ts-common'
import { BlockbookEthereum, GetAddressDetailsOptions, NormalizedTxEthereum } from 'blockbook-client'

import { EthereumBlockbookConnectedConfig, EthereumNetworkDataProvider } from './types'
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

  async getBlock(id?: string | number): Promise<BlockInfo> {
    const blockId = id ?? (await this.getCurrentBlockNumber())

    const raw = await this._retryDced(() => this.api.getBlock(blockId))

    const blockInfo: BlockInfo = {
      height: raw.height,
      id: raw.hash,
      previousId: raw.previousBlockHash,
      time: new Date(Number(raw.time) * 1000),
      raw,
    }

    return blockInfo
  }

  async getCurrentBlockNumber() {
    const bestBlock = await this._retryDced(() => this.api.getBestBlock())

    return bestBlock.height
  }

  async getTransaction(txId: string): Promise<NormalizedTxEthereum> {
    return this._retryDced(() => this.api.getTx(txId))
  }

  async getAddressDetails(address: string, options?: GetAddressDetailsOptions) {
    return this._retryDced(() => this.api.getAddressDetails(address, options))
  }

  async getERC20Transaction(txId: string, tokenAddress: string) {
    const tx = await this.getTransaction(txId)
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

    return {
      tx,
      txSpecific,
      tokenSymbol: transferredToken.symbol,
      tokenDecimals: transferredToken.decimals.toString(),
      tokenName: transferredToken.name,
    }
  }

  async _retryDced<T>(fn: () => Promise<T>, additionalRetryableErrors?: string[]): Promise<T> {
    return retryIfDisconnected(fn, this.logger, additionalRetryableErrors)
  }
}
