import {
  BalanceActivityCallback,
  GetBalanceActivityOptions,
  BalanceActivity,
  BalanceMonitor,
  RetrieveBalanceActivitiesResult,
} from '@faast/payments-common'
import * as Stellar from 'stellar-sdk'

import { padLeft, omitHidden } from './utils';
import { StellarRawTransaction, StellarCollectionPage } from './types';
import { assertValidAddress } from './helpers'
import { isUndefined, isNumber } from 'util'
import { StellarConnected } from './StellarConnected';
import { EventEmitter } from 'events'
import { Numeric } from '@faast/ts-common';
import BigNumber from 'bignumber.js';

export class StellarBalanceMonitor extends StellarConnected implements BalanceMonitor {

  txEmitter = new EventEmitter()

  _subscribeCancellors: Function[] = []

  async destroy() {
    this._subscribeCancellors.forEach((cancel) => cancel())
  }

  async subscribeAddresses(addresses: string[]) {
    for (let address of addresses) {
      assertValidAddress(address)
    }
    for (let address of addresses) {
      try {
        const cancel = this.getApi().transactions().cursor('now').forAccount(address).stream({
          onmessage: (value) => {
            this.txEmitter.emit('tx', { address, tx: value })
          },
          onerror: (e) => {
            this.logger.error('Stellar tx stream error', e)
          },
        })
        this.logger.log('Stellar address subscribed', address)
        this._subscribeCancellors.push(cancel)
      } catch (e) {
        this.logger.error('Failed to subscribe to stellar address', address, e.toString())
        throw e
      }
    }
  }

  onBalanceActivity(callbackFn: BalanceActivityCallback) {
    this.txEmitter.on('tx', async ({ address, tx }) => {
      const activity = await this.txToBalanceActivity(address, tx)
      if (activity) {
        callbackFn(activity)
      }
    })
  }

  async retrieveBalanceActivities(
    address: string,
    callbackFn: BalanceActivityCallback,
    options: GetBalanceActivityOptions = {},
  ): Promise<RetrieveBalanceActivitiesResult> {
    assertValidAddress(address)
    const { from: fromOption, to: toOption } = options
    const from = new BigNumber(
      isUndefined(fromOption) ? 0 : (Numeric.is(fromOption) ? fromOption : fromOption.confirmationNumber)
    )
    const to = new BigNumber(
      isUndefined(toOption) ? 'Infinity' : (Numeric.is(toOption) ? toOption.toString() : toOption.confirmationNumber)
    )

    const limit = 10
    let lastTx: StellarRawTransaction | undefined
    let transactionPage: StellarCollectionPage<StellarRawTransaction> | undefined
    let transactions: StellarRawTransaction[] | undefined
    while (
      isUndefined(transactionPage) ||
      (transactionPage.records.length === limit
        && lastTx
        // This condition enables retrieving txs until we reach the desired range. No built in way to filter the query
        && (from.lt(lastTx.ledger_attr) || to.lt(lastTx.ledger_attr)))
    ) {
      // I tried doing this with .stream, but it didn't let me order it in descending order
      transactionPage = await this._retryDced(() => transactionPage
        ? transactionPage.next()
        : this.getApi()
          .transactions()
          .forAccount(address)
          .limit(limit)
          .order('desc') // important txs are retrieved newest to oldest for exit condition to work
          .call()
      )
      const transactions = transactionPage.records
      this.logger.debug(`retrieved stellar txs for ${address}`, transactions.map(({ id }) => id))
      for (let tx of transactions) {
        if ((lastTx && tx.id === lastTx.id) || !(from.lt(tx.ledger_attr) && to.gt(tx.ledger_attr))) {
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

  async txToBalanceActivity(address: string, tx: StellarRawTransaction): Promise<BalanceActivity | null> {
    const successful = (tx as any).successful
    if (!successful) {
      this.logger.log(`No balance activity for stellar tx ${tx.id} because successful is ${successful}`)
      return null
    }
    const confirmationNumber = tx.ledger_attr
    const primarySequence = padLeft(String(tx.ledger_attr), 12, '0')
    const secondarySequence = padLeft(String(new Date(tx.created_at).getTime()), 18, '0')
    const ledger = await this.getBlock(confirmationNumber)
    let operation
    try {
      operation = await this._normalizeTxOperation(tx)
    } catch (e) {
      if (e.message.includes('Cannot normalize stellar tx')) {
        return null
      }
      throw e
    }
    const { amount, fee, fromAddress, toAddress } = operation
    if (!(fromAddress === address || toAddress === address)) {
      this.logger.log(`Stellar transaction ${tx.id} operation does not apply to ${address}`)
      return null
    }
    const type = toAddress === address ? 'in' : 'out'
    const extraId = toAddress === address ? tx.memo : null
    const tertiarySequence = type === 'out' ? '00' : '01'
    const activitySequence = `${primarySequence}.${secondarySequence}.${tertiarySequence}`

    const netAmount = type === 'out' ? amount.plus(fee).times(-1) : amount

    return {
      type,
      networkType: this.networkType,
      networkSymbol: 'XLM',
      assetSymbol: 'XLM',
      address: address,
      extraId: !isUndefined(extraId) ? extraId : null,

      amount: netAmount.toString(),

      externalId: tx.id,
      activitySequence,
      confirmationId: ledger.hash,
      confirmationNumber: String(confirmationNumber),
      timestamp: new Date(ledger.closed_at),
    }
  }
}
