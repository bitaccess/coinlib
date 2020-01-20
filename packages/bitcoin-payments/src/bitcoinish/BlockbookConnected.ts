import { NetworkType } from '@faast/payments-common'
import { Logger, assertType, DelegateLogger } from '@faast/ts-common'
import { BlockbookBitcoin } from 'blockbook-client'

import { BlockbookConnectedConfig } from './types'
import { DEFAULT_NETWORK, PACKAGE_NAME } from '../constants'
import { resolveServer, retryIfDisconnected } from './utils'

export abstract class BlockbookConnected {
  networkType: NetworkType
  logger: Logger
  api: BlockbookBitcoin | null
  server: string | null

  constructor(config: BlockbookConnectedConfig) {
    assertType(BlockbookConnectedConfig, config)
    this.networkType = config.network
    this.logger = new DelegateLogger(config.logger)
    const { api, server } = resolveServer(config.server, this.networkType)
    this.api = api
    this.server = server
  }

  getApi(): BlockbookBitcoin {
    if (this.api === null) {
      throw new Error('Cannot access Bitcoin network when configured with null server')
    }
    return this.api
  }

  async init(): Promise<void> {}

  async destroy(): Promise<void> {}

  async _retryDced<T>(fn: () => Promise<T>): Promise<T> {
    return retryIfDisconnected(fn, this.getApi(), this.logger)
  }
}
