import {
  BalanceActivityCallback,
  GetBalanceActivityOptions,
  BalanceActivity,
  BalanceMonitor,
  RetrieveBalanceActivitiesResult,
} from '@faast/payments-common'
import * as Stellar from 'stellar-sdk'

import { padLeft } from './utils'
import { StellarRawTransaction, StellarCollectionPage } from './types';
import { assertValidAddress } from './helpers'
import { isUndefined, isNumber } from 'util'
import { StellarConnected } from './StellarConnected';
import { EventEmitter } from 'events'

export class StellarBalanceMonitor extends StellarConnected implements BalanceMonitor {

  txEmitter = new EventEmitter()

  async subscribeAddresses(addresses: string[]) {
    for (let address of addresses) {
      assertValidAddress(address)
    }
    for (let address of addresses) {
      try {
        this.getApi().transactions().forAccount(address).stream({
          onmessage: (value) => {
            this.txEmitter.emit('tx', value)
          },
          onerror: (e) => {
            this.logger.error('Stellar tx stream error', e)
          },
        })
        this.logger.log('Stellar address subscribed', address)
      } catch (e) {
        this.logger.error('Failed to subscribe to stellar address', address, e.toString())
        throw e
      }
    }
  }

  onBalanceActivity(callbackFn: BalanceActivityCallback) {
    this.txEmitter.on('tx', async (tx) => {
      const activity = await this.txToBalanceActivity(tx.address, tx)
      if (activity) {
        callbackFn(activity)
      }
    })
  }

  async resolveFromToLedgers(options: GetBalanceActivityOptions): Promise<RetrieveBalanceActivitiesResult> {
    const { from, to } = options
    const resolvedFrom = isUndefined(from) ? 0 : isNumber(from) ? from : from.confirmationNumber
    const resolvedTo = isUndefined(to) ? Number.MAX_SAFE_INTEGER : isNumber(to) ? to : to.confirmationNumber
    return {
      from: resolvedFrom,
      to: resolvedTo,
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
    let lastTx: StellarRawTransaction | undefined
    let transactionPage: StellarCollectionPage<StellarRawTransaction> | undefined
    let transactions: StellarRawTransaction[] | undefined
    while (
      isUndefined(transactionPage) ||
      (transactionPage.records.length === limit
        && lastTx
        // This condition enables retrieving txs until we reach the desired range. No built in way to filter the query
        && (lastTx.ledger_attr >= from || lastTx.ledger_attr >= to))
    ) {
      transactionPage = await this._retryDced(() => transactionPage
        ? transactionPage.next()
        : this.getApi()
          .transactions()
          .forAccount(address)
          .limit(limit)
          .order('desc') // important txs are retrieved newest to oldest for while loop condition to work
          .call()
      )
      const transactions = transactionPage.records
      this.logger.debug(`retrieved stellar txs for ${address}`, transactions)
      for (let tx of transactions) {
        if ((lastTx && tx.id === lastTx.id) || !(tx.ledger_attr >= from && tx.ledger_attr <= to)) {
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

  private async txToBalanceActivity(address: string, tx: StellarRawTransaction): Promise<BalanceActivity | null> {
    const successful = (tx as any).successful
    if (!successful) {
      this.logger.log(`No balance activity for stellar tx ${tx.id} because successful is ${successful}`)
      return null
    }
    const confirmationNumber = tx.ledger_attr
    const primarySequence = padLeft(String(tx.ledger_attr), 12, '0')
    const secondarySequence = padLeft(String(new Date(tx.created_at).getTime()), 15, '0')
    const [ledger, { amount, fromAddress, toAddress }] = await Promise.all([
      this.getBlock(confirmationNumber),
      this._normalizeTxOperation(tx),
    ])
    if (!(fromAddress === address || toAddress === address)) {
      this.logger.log(`Stellar transaction ${tx.id} operation does not apply to ${address}`)
      return null
    }
    const type = toAddress === address ? 'in' : 'out'
    const extraId = toAddress === address ? tx.memo : null
    const tertiarySequence = type === 'out' ? '00' : '01'
    const activitySequence = `${primarySequence}.${secondarySequence}.${tertiarySequence}`
    return {
      type,
      networkType: this.networkType,
      networkSymbol: 'XLM',
      assetSymbol: 'XLM',
      address: address,
      extraId: !isUndefined(extraId) ? extraId : null,

      amount,

      externalId: tx.id,
      activitySequence,
      confirmationId: ledger.hash,
      confirmationNumber,
      timestamp: new Date(ledger.closed_at),
    }
  }
}
