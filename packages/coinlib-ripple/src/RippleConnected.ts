import { NetworkType } from '@bitaccess/coinlib-common'
import { RippleAPI } from 'ripple-lib'
import { Logger, assertType, DelegateLogger, isString } from '@bitaccess/ts-common'
import promiseRetry from 'promise-retry'
import { BaseRippleConfig, RippleServerAPI } from './types'
import {
  PACKAGE_NAME,
  DEFAULT_NETWORK,
  DEFAULT_TESTNET_SERVER,
  DEFAULT_MAINNET_SERVER,
  MAX_API_CALL_RETRIES,
  RETRYABLE_ERRORS,
  CONNECTION_ERRORS,
} from './constants'

export abstract class RippleConnected {
  networkType: NetworkType
  logger: Logger
  api: RippleAPI
  server: string | null

  constructor(config: BaseRippleConfig = {}) {
    assertType(BaseRippleConfig, config)
    this.networkType = config.network || DEFAULT_NETWORK
    this.logger = new DelegateLogger(config.logger, PACKAGE_NAME)
    const { api, server } = this.resolveRippleServer(config, this.networkType)
    this.api = api
    this.server = server
  }

  resolveRippleServer(
    config: BaseRippleConfig,
    network: NetworkType,
  ): { api: RippleServerAPI, server: string | null } {
    let { server, api } = config
    if (api) {
      return {
        api,
        server: (api.connection as any)._url || '',
      }
    }
    if (typeof server === 'undefined') {
      server = network === NetworkType.Testnet ? DEFAULT_TESTNET_SERVER : DEFAULT_MAINNET_SERVER
    }
    if (isString(server)) {
      const api = new RippleServerAPI({
        server,
      })
      api.on('error', (errorCode, errorMessage) => {
        this.logger.warn(`ripple api error ${errorCode}: ${errorMessage}`);
      })
      api.on('connected', () => {
        this.logger.debug('ripple api connected');
      })
      api.on('disconnected', (code) => {
        // code - [close code](https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent) sent by the server
        // will be 1000 if this was normal closure
        this.logger.warn(`ripple api disconnected, code: ${code}`);
      })
      return {
        api,
        server,
      }
    } else {
      // null server arg -> offline mode
      return {
        api: new RippleServerAPI(),
        server: null,
      }
    }
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
    return promiseRetry(
      (retry, attempt) => {
        return fn().catch(async e => {
          const eName = e ? e.constructor.name : ''
          if (RETRYABLE_ERRORS.includes(eName)) {
            if (CONNECTION_ERRORS.includes(eName)) {
              this.logger.log(
                'Connection error during rippleApi call, attempting to reconnect then ' +
                  `retrying ${MAX_API_CALL_RETRIES - attempt} more times`,
                e.toString(),
              )
              if (this.api.isConnected()) {
                await this.api.disconnect()
              }
              await this.api.connect()
            } else {
              this.logger.log(
                `Retryable error during rippleApi call, retrying ${MAX_API_CALL_RETRIES - attempt} more times`,
                e.toString(),
              )
            }
            retry(e)
          }
          throw e
        })
      },
      {
        retries: MAX_API_CALL_RETRIES,
      },
    )
  }
}
