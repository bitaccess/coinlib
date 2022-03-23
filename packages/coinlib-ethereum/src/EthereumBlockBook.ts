import { Logger } from '@faast/ts-common'
import { BlockbookEthereum, GetAddressDetailsOptions } from 'blockbook-client'

import { EthereumBlockbookConnectedConfig } from './types'
import { handleException, retryIfDisconnected, resolveServer } from './utils'

export class EthereumBlockbook {
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

  async getBlock(blockId: string | number, page?: number) {
    return this._handleException(() => {
      return this._retryDced(() => this.api.getBlock(blockId, { page }))
    })
  }

  async getCurrentBlockNumber() {
    const bestBlock = await this._handleException(() => {
      return this._retryDced(() => this.api.getBestBlock())
    })

    if (!bestBlock) {
      return null
    }

    return bestBlock.height
  }

  async getTransaction(txId: string) {
    return this._handleException(() => {
      return this._retryDced(() => this.api.getTx(txId))
    })
  }

  async getAddressDetails(address: string, options?: GetAddressDetailsOptions) {
    return this._handleException(async () => {
      return this._retryDced(() => this.api.getAddressDetails(address, options))
    })
  }

  async _retryDced<T>(fn: () => Promise<T>, additionalRetryableErrors?: string[]): Promise<T> {
    return retryIfDisconnected(fn, this.logger, additionalRetryableErrors)
  }

  async _handleException<T>(fn: () => Promise<T>, logPrefix?: string): Promise<T | null> {
    return handleException(fn, this.logger, logPrefix)
  }
}
