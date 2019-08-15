import {
  BalanceActivityCallback,
  GetBalanceActivityOptions,
  BalanceActivity,
  BalanceActivityType,
  BalanceMonitor,
} from '@faast/payments-common'
import { RippleAPI } from 'ripple-lib'
import { FormattedPaymentTransaction, FormattedTransactionType } from 'ripple-lib/dist/npm/transaction/types'
import { TransactionsOptions } from 'ripple-lib/dist/npm/ledger/transactions'

import { padLeft, resolveRippleServer } from './utils'
import { RippleBalanceMonitorConfig } from './types'
import { assertValidAddress } from './helpers'
import { isUndefined, isNumber, isString } from 'util'
import { assertType } from '@faast/ts-common'

export class RippleBalanceMonitor extends BalanceMonitor {
  rippleApi: RippleAPI

  constructor(config: RippleBalanceMonitorConfig) {
    super(config)
    assertType(RippleBalanceMonitorConfig, config)
    this.rippleApi = resolveRippleServer(config.server, this.networkType)
  }

  async init(): Promise<void> {
    if (!this.rippleApi.isConnected()) {
      await this.rippleApi.connect()
    }
  }

  async destroy(): Promise<void> {
    if (this.rippleApi.isConnected()) {
      await this.rippleApi.disconnect()
    }
  }

  async subscribeAddresses(addresses: string[]) {
    for (let address of addresses) {
      assertValidAddress(address)
    }
    try {
      const res = await this.rippleApi.request('subscribe', { accounts: addresses })
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
    this.rippleApi.connection.on('transaction', async (tx: FormattedTransactionType) => {
      if (tx.type === 'payment') {
        const activities = await this.paymentToBalanceActivities(tx.address, tx as FormattedPaymentTransaction)
        for (let activity of activities) {
          callbackFn(activity)
        }
      }
    })
  }

  async retrieveBalanceActivities(
    address: string,
    callbackFn: BalanceActivityCallback,
    options: GetBalanceActivityOptions = {},
  ): Promise<void> {
    assertValidAddress(address)
    const { from, to } = options
    const fromLedgerVersion = isUndefined(from) ? undefined : isNumber(from) ? from : from.confirmationNumber
    const toLedgerVersion = isUndefined(to) ? undefined : isNumber(to) ? to : to.confirmationNumber
    const limit = 10
    let lastTx: FormattedTransactionType | undefined
    let transactions: FormattedTransactionType[] | undefined
    while (
      !lastTx ||
      !transactions ||
      (transactions.length === limit && (toLedgerVersion ? lastTx.outcome.ledgerVersion <= toLedgerVersion : true))
    ) {
      const getTransactionOptions: TransactionsOptions = {
        types: ['payment'],
        earliestFirst: true,
        excludeFailures: true,
        limit,
      }
      if (lastTx) {
        getTransactionOptions.startTx = lastTx
      } else {
        getTransactionOptions.minLedgerVersion = fromLedgerVersion
        getTransactionOptions.maxLedgerVersion = toLedgerVersion
      }
      transactions = await this.rippleApi.getTransactions(address, getTransactionOptions)
      for (let tx of transactions) {
        if (
          tx.type !== 'payment' ||
          (lastTx && tx.id === lastTx.id) ||
          (fromLedgerVersion && tx.outcome.ledgerVersion < fromLedgerVersion) ||
          (toLedgerVersion && tx.outcome.ledgerVersion > toLedgerVersion)
        ) {
          continue
        }
        const payment = tx as FormattedPaymentTransaction
        const activities = await this.paymentToBalanceActivities(address, payment)
        for (let activity of activities) {
          await callbackFn(activity)
        }
      }
      lastTx = transactions[transactions.length - 1]
    }
  }

  private determineActivityTypes(address: string, tx: FormattedPaymentTransaction): BalanceActivityType[] {
    const result: BalanceActivityType[] = []
    if (tx.specification.source.address === address) {
      result.push('out')
    }
    if (tx.specification.destination.address === address) {
      result.push('in')
    }
    return result
  }

  private async paymentToBalanceActivities(
    address: string,
    tx: FormattedPaymentTransaction,
  ): Promise<BalanceActivity[]> {
    const types = this.determineActivityTypes(address, tx)
    if (types.length === 0) {
      this.logger.log(
        `Cannot determine balance activity for ripple tx ${tx.id} because it doesnt concern address ${address}`,
      )
      return []
    }
    const result: BalanceActivity[] = []
    const confirmationNumber = tx.outcome.ledgerVersion
    const primarySequence = padLeft(String(tx.outcome.ledgerVersion), 12, '0')
    const secondarySequence = padLeft(String(tx.outcome.indexInLedger), 8, '0')
    const ledger = await this.rippleApi.getLedger({ ledgerVersion: confirmationNumber })
    for (let type of types) {
      const tag = (type === 'out' ? tx.specification.source : tx.specification.destination).tag
      const amountObject =
        tx.outcome.deliveredAmount || tx.specification.source.amount || (tx.specification.source as any).maxAmount
      const amount = `${type === 'out' ? '-' : ''}${amountObject.value}`
      const assetSymbol = amountObject.currency
      const tertiarySequence = type === 'out' ? '00' : '01'
      const activitySequence = `${primarySequence}.${secondarySequence}.${tertiarySequence}`
      result.push({
        type,
        networkType: this.networkType,
        networkSymbol: 'TRX',
        assetSymbol,
        address: address,
        extraId: typeof tag !== 'undefined' ? String(tag) : null,

        amount,

        externalId: tx.id,
        activitySequence,
        confirmationId: ledger.ledgerHash,
        confirmationNumber,
        timestamp: new Date(ledger.closeTime),
      })
    }
    return result
  }
}
