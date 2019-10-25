import { NetworkType } from '@faast/payments-common'
import { RippleAPI } from 'ripple-lib'
import { Logger, assertType, DelegateLogger } from '@faast/ts-common'
import { BaseRippleConfig } from './types'
import { resolveRippleServer, retryIfDisconnected } from './utils'
import { PACKAGE_NAME, DEFAULT_NETWORK } from './constants'

export abstract class RippleConnected {
  networkType: NetworkType
  logger: Logger
  api: RippleAPI
  server: string | null

  constructor(config: BaseRippleConfig = {}) {
    assertType(BaseRippleConfig, config)
    this.networkType = config.network || DEFAULT_NETWORK
    this.logger = new DelegateLogger(config.logger, PACKAGE_NAME)
    const { api, server } = resolveRippleServer(config.server, this.networkType)
    this.api = api
    this.server = server
  }

  async init(): Promise<void> {
    if (!this.api.isConnected()) {
      await this.api.connect()
    }
  }

  async destroy(): Promise<void> {
    if (this.api.isConnected()) {
      await this.api.disconnect()
    }
  }

  async _retryDced<T>(fn: () => Promise<T>): Promise<T> {
    return retryIfDisconnected(fn, this.api, this.logger)
  }
}
