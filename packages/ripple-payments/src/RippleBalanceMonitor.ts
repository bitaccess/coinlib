import { NetworkType } from '@faast/payments-common'
import { RippleAPI } from 'ripple-lib'
import { FormattedPaymentTransaction, FormattedTransactionType } from 'ripple-lib/dist/npm/transaction/types'
import { TransactionsOptions } from 'ripple-lib/dist/npm/ledger/transactions'
import { Logger, DelegateLogger } from '@faast/ts-common'

import { padLeft } from './utils'
import {
  RippleBalanceMonitorConfig,
  BalanceActivityCallback,
  GetBalanceActivityOptions,
  BalanceActivity,
  BalanceActivityType,
} from './types'
import { PACKAGE_NAME } from './constants'

export class RippleBalanceMonitor {
  networkType: NetworkType
  rippleApi: RippleAPI
  logger: Logger

  constructor(config: RippleBalanceMonitorConfig) {
    if (config.server instanceof RippleAPI) {
      this.rippleApi = config.server
    } else {
      this.rippleApi = new RippleAPI({ server: config.server })
    }
    this.networkType = config.network
    this.logger = new DelegateLogger(config.logger, PACKAGE_NAME)
  }

  async init() {
    if (!this.rippleApi.isConnected()) {
      await this.rippleApi.connect()
    }
    this.rippleApi.connection.on('transaction', t => {
      this.logger.log(t)
    })
  }

  async subscribeAddresses(addresses: string[]) {
    await this.rippleApi
      .request('subscribe', { accounts: addresses })
      .then(res => {
        if (res.status === 'success') {
          this.logger.log('Successfully subscribed', res)
        }
      })
      .catch(e => {
        this.logger.error('failed to subscribe to ripple addresses', e.toString())
        throw e
      })
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

  async getBalanceActivities(
    address: string,
    callbackFn: BalanceActivityCallback,
    options: GetBalanceActivityOptions = {},
  ): Promise<void> {
    const { from, to } = options
    const limit = 10
    let lastTx: FormattedTransactionType | undefined
    let transactions: FormattedTransactionType[] | undefined
    while (
      !lastTx ||
      !transactions ||
      (transactions.length === limit && (to ? lastTx.outcome.ledgerVersion <= to.confirmationNumber : true))
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
        getTransactionOptions.minLedgerVersion = from ? from.confirmationNumber : undefined
        getTransactionOptions.maxLedgerVersion = to ? to.confirmationNumber : undefined
      }
      transactions = await this.rippleApi.getTransactions(address, getTransactionOptions)
      for (let tx of transactions) {
        if (
          tx.type !== 'payment' ||
          (lastTx && tx.id === lastTx.id) ||
          (from && tx.outcome.ledgerVersion < from.confirmationNumber) ||
          (to && tx.outcome.ledgerVersion > to.confirmationNumber)
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
      const adjustment = type === 'out' ? tx.specification.source : tx.specification.destination
      const tag = adjustment.tag
      const amount = `${type === 'out' ? '-' : ''}${adjustment.amount.value}`
      const assetSymbol = adjustment.amount.currency
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
