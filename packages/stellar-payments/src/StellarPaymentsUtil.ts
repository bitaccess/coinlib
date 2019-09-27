import { PaymentsUtils, NetworkType, Payport } from '@faast/payments-common'
import { Server as StellarApi } from 'stellar-sdk'

import {
  toMainDenominationString,
  toBaseDenominationString,
  isValidXprv,
  isValidXpub,
  isValidAddress,
  isValidExtraId,
} from './helpers'
import { Logger, DelegateLogger, isNil, assertType } from '@faast/ts-common'
import { PACKAGE_NAME, DEFAULT_NETWORK } from './constants'
import { BaseStellarConfig } from './types'
import { resolveStellarServer, retryIfDisconnected } from './utils'

export class StellarPaymentsUtils implements PaymentsUtils {
  networkType: NetworkType
  logger: Logger
  api: StellarApi | null
  server: string | null

  constructor(config: BaseStellarConfig = {}) {
    assertType(BaseStellarConfig, config)
    this.networkType = config.network || DEFAULT_NETWORK
    this.logger = new DelegateLogger(config.logger, PACKAGE_NAME)
    const { api, server } = resolveStellarServer(config.server, this.networkType)
    this.api = api
    this.server = server
  }

  private getApi(): StellarApi {
    if (this.api === null) {
      throw new Error('Cannot access stellar network when configured with null server')
    }
    return this.api
  }

  async init(): Promise<void> {}

  async destroy(): Promise<void> {}

  async _retryDced<T>(fn: () => Promise<T>): Promise<T> {
    return retryIfDisconnected(fn, this.getApi(), this.logger)
  }

  async isValidExtraId(extraId: string): Promise<boolean> {
    return isValidExtraId(extraId)
  }

  async isValidAddress(address: string): Promise<boolean> {
    return isValidAddress(address)
  }

  private async getPayportValidationMessage(payport: Payport): Promise<string | undefined> {
    const { address, extraId } = payport
    if (!(await this.isValidAddress(address))) {
      return 'Invalid payport address'
    }
    if (!isNil(extraId) && !(await this.isValidExtraId(extraId))) {
      return 'Invalid payport extraId'
    }
  }

  async validatePayport(payport: Payport): Promise<void> {
    assertType(Payport, payport)
    const message = await this.getPayportValidationMessage(payport)
    if (message) {
      throw new Error(message)
    }
  }

  async isValidPayport(payport: Payport): Promise<boolean> {
    if (!Payport.is(payport)) {
      return false
    }
    return !(await this.getPayportValidationMessage(payport))
  }

  toMainDenomination(amount: string | number): string {
    return toMainDenominationString(amount)
  }

  toBaseDenomination(amount: string | number): string {
    return toBaseDenominationString(amount)
  }

  isValidXprv = isValidXprv
  isValidXpub = isValidXpub
}
