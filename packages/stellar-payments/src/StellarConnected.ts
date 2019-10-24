import { NetworkType } from '@faast/payments-common'
import { Logger, assertType, DelegateLogger } from '@faast/ts-common'
import * as Stellar from 'stellar-sdk'

import { BaseStellarConfig, StellarRawLedger, StellarRawTransaction, StellarLedger } from './types'
import { DEFAULT_NETWORK, PACKAGE_NAME } from './constants'
import { resolveStellarServer, retryIfDisconnected, isStellarLedger } from './utils'
import BigNumber from 'bignumber.js';
import { toMainDenominationBigNumber } from './helpers';

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

  async getBlock(id?: string | number): Promise<StellarRawLedger> {
    let query = this.getApi()
      .ledgers()
      .order('desc')
      .limit(1)
    if (id) {
      query = query.ledger(id)
    }
    const ledgerCallResult = await this._retryDced(() => query.call())
    let ledger: StellarLedger
    if (ledgerCallResult.records) {
      ledger = ledgerCallResult.records[0]
    } else if (isStellarLedger(ledgerCallResult)) {
      ledger = ledgerCallResult
    } else {
      this.logger.log(`getBlock(${id ? id : ''}) ledgerCallResult`, ledgerCallResult)
      throw new Error(`Cannot get stellar ledger ${id ? id : 'head'}`)
    }
    return ledger
  }

  async _normalizeTxOperation(
    tx: StellarRawTransaction,
  ): Promise<{ amount: BigNumber, fee: BigNumber, fromAddress: string, toAddress: string }> {
    const opPage = await this._retryDced(() => tx.operations())
    const op = opPage.records.find(({ type }) => type === 'create_account' || type === 'payment')
    if (!op) {
      throw new Error(`Cannot normalize stellar tx - operation not found for transaction ${tx.id}`)
    }
    let fromAddress: string
    let toAddress: string
    let amount: string
    if (op.type === 'create_account') {
      fromAddress = op.funder
      toAddress = op.account
      amount = op.starting_balance
    } else if (op.type === 'payment') {
      if (op.asset_type !== 'native') {
        throw new Error(`Cannot normalize stellar tx - Unsupported stellar payment asset ${op.asset_type}`)
      }
      fromAddress = op.from
      toAddress = op.to
      amount = op.amount
    } else {
      throw new Error(`Cannot normalize stellar tx - Unsupported stellar operation type ${op.type}`)
    }
    const fee = toMainDenominationBigNumber(tx.fee_paid)
    return { amount: new BigNumber(amount), fee, fromAddress, toAddress }
  }
}
