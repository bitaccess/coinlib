import { NetworkType } from '@bitaccess/coinlib-common'
import { Logger, assertType, DelegateLogger } from '@faast/ts-common'
import { BlockbookBitcoin } from 'blockbook-client'

import { BlockbookConnectedConfig, BlockbookServerAPI } from './types'
import { resolveServer, retryIfDisconnected } from './utils'

export abstract class BlockbookConnected {
  networkType: NetworkType
  logger: Logger
  api: BlockbookServerAPI
  server: string[] | null

  constructor(config: BlockbookConnectedConfig) {
    assertType(BlockbookConnectedConfig, config)
    this.networkType = config.network
    this.logger = new DelegateLogger(config.logger, config.packageName)
    const { api, server } = resolveServer(config, this.logger)
    this.api = api
    this.server = server
  }

  getApi(): BlockbookBitcoin {
    if (this.server === null) {
      throw new Error('Cannot access blockbook network when configured with null server')
    }
    return this.api
  }

  async init(): Promise<void> {
    await this.api.connect()
  }

  async destroy(): Promise<void> {
    await this.api.disconnect()
  }

  async _retryDced<T>(fn: () => Promise<T>): Promise<T> {
    return retryIfDisconnected(fn, this.getApi(), this.logger)
  }
}
