import {
  BalanceActivityCallback,
  GetBalanceActivityOptions,
  BalanceActivity,
  BalanceActivityType,
  BalanceMonitor,
  RetrieveBalanceActivitiesResult,
} from '@faast/payments-common'
import { StellarAPI } from 'stellar-sdk'
import { FormattedPaymentTransaction, FormattedTransactionType } from 'stellar-sdk/dist/npm/transaction/types'
import { TransactionsOptions } from 'stellar-sdk/dist/npm/ledger/transactions'

import { padLeft, resolveStellarServer, retryIfDisconnected } from './utils'
import { StellarBalanceMonitorConfig } from './types'
import { assertValidAddress } from './helpers'
import { isUndefined, isNumber, isString, isNull } from 'util'
import { assertType } from '@faast/ts-common'

export class StellarBalanceMonitor extends BalanceMonitor {
  stellarApi: StellarAPI
  server: string | null

  constructor(public config: StellarBalanceMonitorConfig) {
    super(config)
    assertType(StellarBalanceMonitorConfig, config)
    const { api, server } = resolveStellarServer(config.server, this.networkType)
    this.stellarApi = api
    this.server = server
  }

  async init(): Promise<void> {
    if (!this.stellarApi.isConnected()) {
      await this.stellarApi.connect()
    }
  }

  async destroy(): Promise<void> {
    if (this.stellarApi.isConnected()) {
      await this.stellarApi.disconnect()
    }
  }

  private async retryDced<T>(fn: () => Promise<T>): Promise<T> {
    return retryIfDisconnected(fn, this.stellarApi, this.logger)
  }

  async subscribeAddresses(addresses: string[]) {
    for (let address of addresses) {
      assertValidAddress(address)
    }
    try {
      const res = await this.retryDced(() => this.stellarApi.request('subscribe', { accounts: addresses }))
      if (res.status === 'success') {
        this.logger.log('Stellar successfully subscribed', res)
      } else {
        this.logger.warn('Stellar subscribe unsuccessful', res)
      }
    } catch (e) {
      this.logger.error('Failed to subscribe to stellar addresses', e.toString())
      throw e
    }
  }

  onBalanceActivity(callbackFn: BalanceActivityCallback) {
    this.stellarApi.connection.on('transaction', async (tx: FormattedTransactionType) => {
      const activity = await this.txToBalanceActivity(tx.address, tx)
      if (activity) {
        callbackFn(activity)
      }
    })
  }

  async resolveFromToLedgers(options: GetBalanceActivityOptions): Promise<RetrieveBalanceActivitiesResult> {
    const serverInfo = await this.retryDced(() => this.stellarApi.getServerInfo())
    const completeLedgers = serverInfo.completeLedgers.split('-')
    let fromLedgerVersion = Number.parseInt(completeLedgers[0])
    let toLedgerVersion = Number.parseInt(completeLedgers[1])
    const { from, to } = options
    const requestedFrom = isUndefined(from) ? undefined : isNumber(from) ? from : from.confirmationNumber
    const requestedTo = isUndefined(to) ? undefined : isNumber(to) ? to : to.confirmationNumber
    if (isNumber(requestedFrom)) {
      if (requestedFrom < fromLedgerVersion) {
        this.logger.warn(
          `Server balance activity doesn't go back to ledger ${requestedFrom}, using ${fromLedgerVersion} instead`,
        )
      } else {
        fromLedgerVersion = requestedFrom
      }
    }
    if (isNumber(requestedTo)) {
      if (requestedTo > toLedgerVersion) {
        this.logger.warn(
          `Server balance activity doesn't go up to ledger ${requestedTo}, using ${toLedgerVersion} instead`,
        )
      } else {
        toLedgerVersion = requestedTo
      }
    }
    return {
      from: fromLedgerVersion,
      to: toLedgerVersion,
    }
  }

  async retrieveBalanceActivities(
    address: string,
    callbackFn: BalanceActivityCallback,
    options: GetBalanceActivityOptions = {},
  ): Promise<RetrieveBalanceActivitiesResult> {
    assertValidAddress(address)
    const { from, to } = await this.resolveFromToLedgers(options)
    const limit = 10
    let lastTx: FormattedTransactionType | undefined
    let transactions: FormattedTransactionType[] | undefined
    while (
      isUndefined(transactions) ||
      (transactions.length === limit && lastTx && lastTx.outcome.ledgerVersion <= to)
    ) {
      const getTransactionOptions: TransactionsOptions = {
        earliestFirst: true,
        excludeFailures: false,
        limit,
      }
      if (lastTx) {
        getTransactionOptions.start = lastTx.id
      } else {
        getTransactionOptions.minLedgerVersion = from
        getTransactionOptions.maxLedgerVersion = to
      }
      transactions = await this.retryDced(() => this.stellarApi.getTransactions(address, getTransactionOptions))
      this.logger.debug(`retrieved stellar txs for ${address}`, transactions)
      for (let tx of transactions) {
        if ((lastTx && tx.id === lastTx.id) || tx.outcome.ledgerVersion < from || tx.outcome.ledgerVersion > to) {
          continue
        }
        const activity = await this.txToBalanceActivity(address, tx)
        if (activity) {
          await callbackFn(activity)
        }
      }
      lastTx = transactions[transactions.length - 1]
    }
    return { from, to }
  }

  private isPaymentTx(tx: FormattedTransactionType): tx is FormattedPaymentTransaction {
    return tx.type === 'payment'
  }

  private async txToBalanceActivity(address: string, tx: FormattedTransactionType): Promise<BalanceActivity | null> {
    if (!tx.outcome) {
      this.logger.warn('txToBalanceActivity received tx object without outcome!', tx)
      return null
    }
    const txResult = tx.outcome.result
    if (!isString(txResult) || !(txResult.startsWith('tes') || txResult.startsWith('tec'))) {
      this.logger.log(`No balance activity for stellar tx ${tx.id} because status is ${txResult}`)
      return null
    }
    const confirmationNumber = tx.outcome.ledgerVersion
    const primarySequence = padLeft(String(tx.outcome.ledgerVersion), 12, '0')
    const secondarySequence = padLeft(String(tx.outcome.indexInLedger), 8, '0')
    const ledger = await this.retryDced(() => this.stellarApi.getLedger({ ledgerVersion: confirmationNumber }))
    const balanceChange = (tx.outcome.balanceChanges[address] || []).find(({ currency }) => currency === 'XRP')
    if (!balanceChange) {
      this.logger.log(
        `Cannot determine balanceChange for address ${address} in stellar tx ${tx.id} because there's no XRP entry`,
      )
      return null
    }
    const amount = balanceChange.value
    const assetSymbol = balanceChange.currency
    const type = amount.startsWith('-') ? 'out' : 'in'
    const tag = this.isPaymentTx(tx)
      ? (type === 'out' ? tx.specification.source : tx.specification.destination).tag
      : undefined
    const tertiarySequence = type === 'out' ? '00' : '01'
    const activitySequence = `${primarySequence}.${secondarySequence}.${tertiarySequence}`
    return {
      type,
      networkType: this.networkType,
      networkSymbol: 'XRP',
      assetSymbol,
      address: address,
      extraId: !isUndefined(tag) ? String(tag) : null,

      amount,

      externalId: tx.id,
      activitySequence,
      confirmationId: ledger.ledgerHash,
      confirmationNumber,
      timestamp: new Date(ledger.closeTime),
    }
  }
}
