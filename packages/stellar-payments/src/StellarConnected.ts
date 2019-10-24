import { NetworkType } from '@faast/payments-common'
import { Logger, assertType, DelegateLogger } from '@faast/ts-common'
import * as Stellar from 'stellar-sdk'

import { BaseStellarConfig, StellarRawLedger, StellarRawTransaction } from './types'
import { DEFAULT_NETWORK, PACKAGE_NAME } from './constants'
import { resolveStellarServer, retryIfDisconnected } from './utils'

export abstract class StellarConnected {
  networkType: NetworkType
  logger: Logger
  api: Stellar.Server | null
  server: string | null

  constructor(config: BaseStellarConfig = {}) {
    assertType(BaseStellarConfig, config)
    this.networkType = config.network || DEFAULT_NETWORK
    this.logger = new DelegateLogger(config.logger, PACKAGE_NAME)
    const { api, server } = resolveStellarServer(config.server, this.networkType)
    this.api = api
    this.server = server
  }

  getApi(): Stellar.Server {
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

  async getBlock(id: string | number): Promise<StellarRawLedger> {
    const ledgerPage = await this._retryDced(() => this.getApi()
      .ledgers()
      .ledger(id)
      .call()
    )
    if (ledgerPage.records.length === 0) {
      throw new Error(`Cannot get stellar ledger ${id}`)
    }
    return ledgerPage.records[0]
  }


async _normalizeTxOperation(
  tx: StellarRawTransaction,
): Promise<{ amount: string, fromAddress: string, toAddress: string }> {
  const opPage = await this._retryDced(() => tx.operations())
  const op = opPage.records.find(({ type }) => type === 'create_account' || type === 'payment')
  if (!op) {
    throw new Error(`Operation not found for transaction ${tx.id}`)
  }
  this.logger.debug('operation', op)
  let fromAddress: string
  let toAddress: string
  let amount: string
  if (op.type === 'create_account') {
    fromAddress = op.funder
    toAddress = op.account
    amount = op.starting_balance
  } else if (op.type === 'payment') {
    if (op.asset_type !== 'native') {
      throw new Error(`Unsupported stellar payment asset ${op.asset_type}`)
    }
    fromAddress = op.from
    toAddress = op.to
    amount = op.amount
  } else {
    throw new Error(`Unsupported stellar operation type ${op.type}`)
  }
  return { amount, fromAddress, toAddress }
}
}
