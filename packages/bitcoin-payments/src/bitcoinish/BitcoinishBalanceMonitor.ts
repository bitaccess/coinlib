import {
  UtxoInfo,
  BalanceActivity,
  BalanceActivityCallback,
  BalanceMonitor,
  GetBalanceActivityOptions,
  RetrieveBalanceActivitiesResult,
  NetworkType,
  createUnitConverters,
} from '@faast/payments-common'
import { EventEmitter } from 'events'
import {
  AddressDetailsBitcoinTxs,
  NormalizedTxBitcoin,
  NormalizedTxBitcoinVin,
  NormalizedTxBitcoinVout,
} from 'blockbook-client'
import BigNumber from 'bignumber.js'
import { isUndefined, Numeric } from '@faast/ts-common'

import { BitcoinishBalanceMonitorConfig } from './types'
import { BlockbookConnected } from './BlockbookConnected'
import { BitcoinishPaymentsUtils } from './BitcoinishPaymentsUtils'

export abstract class BitcoinishBalanceMonitor extends BlockbookConnected implements BalanceMonitor {

  readonly coinName: string
  readonly coinSymbol: string
  readonly utils: BitcoinishPaymentsUtils

  constructor(config: BitcoinishBalanceMonitorConfig) {
    super(config)
    this.utils = config.utils
    this.coinName = config.utils.coinName
    this.coinSymbol = config.utils.coinSymbol
  }

  txEmitter = new EventEmitter()

  async subscribeAddresses(addresses: string[]) {
    for (let address of addresses) {
      this.utils.validateAddress(address)
    }
    await this.getApi().subscribeAddresses(addresses, ({ address, tx }) => {
      this.txEmitter.emit('tx', { address, tx })
    })
  }

  onBalanceActivity(callbackFn: BalanceActivityCallback) {
    this.txEmitter.on('tx', async ({ address, tx }) => {
      const activity = await this.txToBalanceActivity(address, tx)
      if (activity) {
        callbackFn(activity, tx)
      }
    })
  }

  async retrieveBalanceActivities(
    address: string,
    callbackFn: BalanceActivityCallback,
    options: GetBalanceActivityOptions = {},
  ): Promise<RetrieveBalanceActivitiesResult> {
    this.utils.validateAddress(address)
    const { from: fromOption, to: toOption } = options
    const from = new BigNumber(
      isUndefined(fromOption) ? 0 : (Numeric.is(fromOption) ? fromOption : fromOption.confirmationNumber)
    ).toNumber()
    const to = new BigNumber(
      isUndefined(toOption) ? 'Infinity' : (Numeric.is(toOption) ? toOption.toString() : toOption.confirmationNumber)
    ).toNumber()

    let page = 1
    let limit = 10
    let lastTx: NormalizedTxBitcoin | undefined
    let transactionPage: AddressDetailsBitcoinTxs | undefined
    let transactions: NormalizedTxBitcoin[] | undefined
    while (
      isUndefined(transactionPage)
        || transactionPage.page < transactionPage.totalPages
        || transactionPage.totalPages === -1
    ) {
      transactionPage = await this._retryDced(() => this.getApi()
          .getAddressDetails(address, {
            details: 'txs',
            page,
            pageSize: limit,
            from,
            to: to < Infinity ? to : undefined,
          }))
      if (transactionPage.page !== page) {
        // Websocket pagination has totalPages === -1 so only way to detect break point is by retrieving
        // the next page and checking if it was actually returned.
        break
      }
      transactions = transactionPage.transactions
      this.logger.debug(`retrieved txs for ${address}`, transactions)
      if (!transactions || transactions.length === 0) {
        break
      }
      for (let tx of transactions) {
        if ((lastTx && tx.txid === lastTx.txid) || from >= tx.blockHeight || to <= tx.blockHeight) {
          continue
        }
        const activity = await this.txToBalanceActivity(address, tx)
        if (activity) {
          await callbackFn(activity, tx)
        }
      }
      lastTx = transactions[transactions.length - 1]
      page++
    }
    return { from: from.toString(), to: to.toString() }
  }

  private extractStandardAddress(v: NormalizedTxBitcoinVout | NormalizedTxBitcoinVin): string | null {
    const address = v.isAddress && v.addresses?.[0]
    return address ? this.utils.standardizeAddress(address) : null
  }

  private extractUtxoInfo(tx: NormalizedTxBitcoin, v: NormalizedTxBitcoinVout | NormalizedTxBitcoinVin): UtxoInfo {
    const isCoinbase = tx.valueIn === '0' && tx.value !== '0'
    return {
      txid: tx.txid,
      vout: v.n,
      satoshis: v.value,
      value: this.utils.toMainDenominationString(v.value),
      confirmations: tx.confirmations,
      height: tx.blockHeight ? String(tx.blockHeight) : undefined,
      coinbase: isCoinbase,
    }
  }

  async txToBalanceActivity(address: string, tx: NormalizedTxBitcoin): Promise<BalanceActivity | null> {
    const externalId = tx.txid
    const confirmationNumber = tx.blockHeight
    const standardizedAddress = this.utils.standardizeAddress(address)
    if (standardizedAddress === null) {
      throw new Error(`Cannot standardize ${this.coinName} address, likely invalid: ${address}`)
    }

    let netSatoshis = new BigNumber(0) // balance increase (positive), or decreased (negative)
    const utxosSpent: UtxoInfo[] = []
    const utxosCreated: UtxoInfo[] = []

    for (let input of tx.vin) {
      if (this.extractStandardAddress(input) === standardizedAddress) {
        netSatoshis = netSatoshis.minus(input.value)
        utxosSpent.push(this.extractUtxoInfo(tx, input))
      }
    }
    for (let output of tx.vout) {
      if (this.extractStandardAddress(output) === standardizedAddress) {
        netSatoshis = netSatoshis.plus(output.value)
        utxosCreated.push(this.extractUtxoInfo(tx, output))
      }
    }

    if (utxosSpent.length || utxosCreated.length) {
      // Theoretically, netSatoshis could be 0, however unlikely, and the tx may still affect the address' utxos.
      // Only return null if the tx has no zero effect on the address' utxos.
      this.logger.log(`${this.coinName} transaction ${externalId} does not affect balance of ${standardizedAddress}`)
      return null
    }

    return {
      type: netSatoshis.gt(0) ? 'in' : 'out',
      networkType: this.networkType,
      networkSymbol: this.coinSymbol,
      assetSymbol: this.coinSymbol,
      address: address,
      extraId: null,

      amount: this.utils.toMainDenominationString(netSatoshis),

      externalId: tx.txid,
      activitySequence: '', // No longer used
      confirmationId: tx.blockHash ?? '',
      confirmationNumber: confirmationNumber,
      confirmations: tx.confirmations,
      timestamp: new Date(tx.blockTime),
      utxosSpent,
      utxosCreated,
    }
  }

}
