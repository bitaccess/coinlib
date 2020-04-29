import {
  BalanceActivityCallback,
  GetBalanceActivityOptions,
  BalanceActivity,
  BalanceMonitor,
  RetrieveBalanceActivitiesResult,
  isMatchingError,
} from '@faast/payments-common'
import { FormattedPaymentTransaction, FormattedTransactionType } from 'ripple-lib/dist/npm/transaction/types'
import { TransactionsOptions } from 'ripple-lib/dist/npm/ledger/transactions'
import { isUndefined, isNumber, isString, Numeric } from '@faast/ts-common'

import { padLeft, retryIfDisconnected } from './utils'
import { RippleBalanceMonitorConfig } from './types'
import { assertValidAddress } from './helpers'
import { RippleConnected } from './RippleConnected'
import BigNumber from 'bignumber.js'
import { NOT_FOUND_ERRORS } from './constants'

export class RippleBalanceMonitor extends RippleConnected implements BalanceMonitor {
  constructor(public config: RippleBalanceMonitorConfig) {
    super(config)
  }

  async subscribeAddresses(addresses: string[]) {
    for (let address of addresses) {
      assertValidAddress(address)
    }
    try {
      const res = await this._retryDced(() => this.api.request('subscribe', { accounts: addresses }))
      if (res.status === 'success') {
        this.logger.log('Ripple successfully subscribed', res)
      } else {
        this.logger.warn('Ripple subscribe unsuccessful', res)
      }
    } catch (e) {
      this.logger.error('Failed to subscribe to ripple addresses', e.toString())
      throw e
    }
  }

  onBalanceActivity(callbackFn: BalanceActivityCallback) {
    this.api.connection.on('transaction', async (tx: FormattedTransactionType) => {
      const activity = await this.txToBalanceActivity(tx.address, tx)
      if (activity) {
        callbackFn(activity)
      }
    })
  }

  private async resolveFromToLedgers(options: GetBalanceActivityOptions): Promise<{ from: BigNumber; to: BigNumber }> {
    const serverInfo = await this._retryDced(() => this.api.getServerInfo())
    const completeLedgers = serverInfo.completeLedgers.split('-')
    let fromLedgerVersion = new BigNumber(completeLedgers[0])
    let toLedgerVersion = new BigNumber(completeLedgers[1])
    const { from, to } = options
    const requestedFrom = isUndefined(from)
      ? undefined
      : new BigNumber(Numeric.is(from) ? from : from.confirmationNumber)
    const requestedTo = isUndefined(to) ? undefined : new BigNumber(Numeric.is(to) ? to : to.confirmationNumber)
    if (!isUndefined(requestedFrom)) {
      if (requestedFrom.lt(fromLedgerVersion)) {
        this.logger.warn(
          `Server balance activity doesn't go back to ledger ${requestedFrom}, using ${fromLedgerVersion} instead`,
        )
      } else {
        fromLedgerVersion = requestedFrom
      }
    }
    if (!isUndefined(requestedTo)) {
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
      (transactions.length === limit && lastTx && to.gt(lastTx.outcome.ledgerVersion))
    ) {
      const getTransactionOptions: TransactionsOptions = {
        earliestFirst: true,
        excludeFailures: false,
        limit,
      }
      if (lastTx) {
        getTransactionOptions.start = lastTx.id
      } else {
        getTransactionOptions.minLedgerVersion = from.toNumber()
        getTransactionOptions.maxLedgerVersion = to.toNumber()
      }
      try {
        transactions = await this._retryDced(() => this.api.getTransactions(address, getTransactionOptions))
      } catch (e) {
        if (isMatchingError(e, NOT_FOUND_ERRORS)) {
          this.logger.debug(`Address ${address} not found`)
          break
        }
        throw e
      }
      this.logger.debug(`retrieved ripple txs for ${address}`, transactions)
      for (let tx of transactions) {
        if ((lastTx && tx.id === lastTx.id) || from.gte(tx.outcome.ledgerVersion) || to.lte(tx.outcome.ledgerVersion)) {
          continue
        }
        const activity = await this.txToBalanceActivity(address, tx)
        if (activity) {
          await callbackFn(activity)
        }
      }
      lastTx = transactions[transactions.length - 1]
    }
    return { from: from.toString(), to: to.toString() }
  }

  private isPaymentTx(tx: FormattedTransactionType): tx is FormattedPaymentTransaction {
    return tx.type === 'payment'
  }

  async txToBalanceActivity(address: string, tx: FormattedTransactionType): Promise<BalanceActivity | null> {
    if (!tx.outcome) {
      this.logger.warn('txToBalanceActivity received tx object without outcome!', tx)
      return null
    }
    const txResult = tx.outcome.result
    if (!isString(txResult) || !(txResult.startsWith('tes') || txResult.startsWith('tec'))) {
      this.logger.log(`No balance activity for ripple tx ${tx.id} because status is ${txResult}`)
      return null
    }
    const confirmationNumber = tx.outcome.ledgerVersion
    const primarySequence = padLeft(String(tx.outcome.ledgerVersion), 12, '0')
    const secondarySequence = padLeft(String(tx.outcome.indexInLedger), 8, '0')
    const ledger = await this._retryDced(() => this.api.getLedger({ ledgerVersion: confirmationNumber }))
    const balanceChange = (tx.outcome.balanceChanges[address] || []).find(({ currency }) => currency === 'XRP')
    if (!balanceChange) {
      this.logger.log(
        `Cannot determine balanceChange for address ${address} in ripple tx ${tx.id} because there's no XRP entry`,
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
      confirmationNumber: String(confirmationNumber),
      timestamp: new Date(ledger.closeTime),
    }
  }
}
