import {
  BlockInfo,
  BalanceActivity,
  BalanceActivityCallback,
  BalanceMonitor,
  FilterBlockAddressesCallback,
  GetBalanceActivityOptions,
  RetrieveBalanceActivitiesResult,
  NewBlockCallback,
} from '@bitaccess/coinlib-common'
import { isUndefined, Numeric } from '@faast/ts-common'

import BigNumber from 'bignumber.js'
import { AddressDetailsEthereumTxs, NormalizedTxEthereum } from 'blockbook-client'
import { EventEmitter } from 'events'
import { get } from 'lodash'
import { BALANCE_ACTIVITY_EVENT } from './constants'
import { EthereumPaymentsUtils } from './EthereumPaymentsUtils'
import { EthereumStandardizedTransaction } from './types'

export class EthereumBalanceMonitor extends EthereumPaymentsUtils implements BalanceMonitor {
  readonly events = new EventEmitter()

  async init(): Promise<void> {
    await this.networkData.connectBlockBook()
  }

  async destroy(): Promise<void> {
    this.events.removeAllListeners('tx')

    await this.networkData.disconnectBlockBook()
  }

  async getTxWithMemoization(txId: string, cache: { [txid: string]: NormalizedTxEthereum }) {
    const memoizedTx = cache[txId]

    if (memoizedTx) {
      return memoizedTx
    }

    const rawTx = await this.networkData.getTxRaw(txId)

    cache[txId] = rawTx

    return rawTx
  }

  private async handleBalanceActivityCallback(
    balanceActivity: BalanceActivity | BalanceActivity[],
    callbackFn: BalanceActivityCallback,
    rawTx?: object,
  ) {
    if (Array.isArray(balanceActivity)) {
      for (const activity of balanceActivity) {
        await callbackFn(activity, rawTx)
      }
    } else {
      await callbackFn(balanceActivity, rawTx)
    }
  }

  async subscribeAddresses(addresses: string[]): Promise<void> {
    const validAddresses = addresses.filter(address => this.isValidAddress(address))

    await this.networkData.subscribeAddresses(validAddresses, async (address, rawTx) => {
      this.events.emit('tx', { address, tx: rawTx })

      const activity = await this.txToBalanceActivity(address, rawTx)

      if (activity) {
        if (Array.isArray(activity)) {
          for (const a of activity) {
            this.events.emit(BALANCE_ACTIVITY_EVENT, { activity: a, tx: rawTx })
          }
        } else {
          this.events.emit(BALANCE_ACTIVITY_EVENT, { activity, tx: rawTx })
        }
      }
    })
  }

  onBalanceActivity(callbackFn: BalanceActivityCallback) {
    this.events.on(BALANCE_ACTIVITY_EVENT, ({ activity, tx }) => {
      callbackFn(activity, tx)?.catch(e =>
        this.logger.error(`Error in ${this.coinSymbol} ${this.networkType} onBalanceActivity callback`, e),
      )
    })
  }

  async retrieveBalanceActivities(
    address: string,
    callbackFn: BalanceActivityCallback,
    options: GetBalanceActivityOptions,
  ): Promise<RetrieveBalanceActivitiesResult> {
    const { from: fromOption, to: toOption } = options
    const from = new BigNumber(
      isUndefined(fromOption) ? 0 : Numeric.is(fromOption) ? fromOption : fromOption.confirmationNumber,
    ).toNumber()
    const to = new BigNumber(
      isUndefined(toOption) ? 'Infinity' : Numeric.is(toOption) ? toOption.toString() : toOption.confirmationNumber,
    ).toNumber()

    let page = 1
    const limit = 10
    let transactionPage: AddressDetailsEthereumTxs | undefined
    let transactions: NormalizedTxEthereum[] | undefined
    let lastTx: NormalizedTxEthereum | undefined

    while (
      isUndefined(transactionPage) ||
      transactionPage.page < transactionPage.totalPages ||
      transactionPage.totalPages === -1
    ) {
      transactionPage = await this.networkData.getAddressDetails(address, {
        page,
        pageSize: limit,
        from,
        to: to < Infinity ? to : undefined,
        details: 'txs',
      })

      if (transactionPage.page !== page) {
        break
      }
      transactions = transactionPage.transactions
      this.logger.debug(`retrieved ${transactions?.length} txs for ${address} on page = ${page}`)

      if (!transactions || transactions.length === 0) {
        break
      }

      for (const tx of transactions) {
        if (lastTx && tx.txid === lastTx.txid) {
          this.logger.debug('ignoring duplicate tx', tx)
          continue
        }
        if (tx.blockHeight > 0 && (from > tx.blockHeight || to < tx.blockHeight)) {
          this.logger.debug('ignoring out of range balance activity tx', tx)
          continue
        }

        const activity = await this.txToBalanceActivity(address, tx)

        if (activity) {
          await this.handleBalanceActivityCallback(activity, callbackFn, tx)
        }
      }

      lastTx = transactions[transactions.length - 1]
      page++
    }

    return { from: from.toString(), to: to.toString() }
  }

  async retrieveBlockBalanceActivities(
    blockId: string | number,
    callbackFn: BalanceActivityCallback,
    filterRelevantAddresses: FilterBlockAddressesCallback,
  ): Promise<BlockInfo> {
    const blockDetails: BlockInfo = await this.networkData.getBlock(blockId)

    const transactions = get(blockDetails.raw, 'transactions', []) as EthereumStandardizedTransaction[]
    const addressTransactions: { [address: string]: Set<EthereumStandardizedTransaction> } = {}

    for (const tx of transactions) {
      const fromAddress = tx.from
      const toAddress = tx.to

      addressTransactions[fromAddress] = (addressTransactions[fromAddress] ?? new Set()).add(tx)
      addressTransactions[toAddress] = (addressTransactions[toAddress] ?? new Set()).add(tx)
    }

    const relevantAddresses = await filterRelevantAddresses(Array.from(Object.keys(addressTransactions)), {
      ...blockDetails,
      page: 1,
    })

    /**
     * The standardized tx may or may not contain the token transfers depending on which data source
     * was used to fetch the NetworkData, so we need to do a hard lookup from the blockbook api for each tx, then also memoize
     */
    const hardTxQueries: { [txid: string]: NormalizedTxEthereum } = {}

    for (const relevantAddress of relevantAddresses) {
      const relevantAddressTransactions = addressTransactions[relevantAddress]
      for (const { txHash } of relevantAddressTransactions) {
        const rawTx = await this.getTxWithMemoization(txHash, hardTxQueries)

        const activity = await this.txToBalanceActivity(relevantAddress, rawTx)

        if (activity) {
          await this.handleBalanceActivityCallback(activity, callbackFn)
        }
      }
    }

    return blockDetails
  }

  getFromAndToAddressFromTx(tx: NormalizedTxEthereum) {
    const inputAddresses = tx.vin[0].addresses
    const outputAddresses = tx.vout[0].addresses

    if (!inputAddresses || !outputAddresses) {
      throw new Error('transaction is missing from or to address')
    }

    const fromAddress = inputAddresses[0]
    const toAddress = outputAddresses[0]

    return { fromAddress, toAddress }
  }

  getActivityType(
    activityAddress: string,
    { txFromAddress, txToAddress, txHash }: { txFromAddress: string; txToAddress: string; txHash: string },
  ) {
    let type: BalanceActivity['type'] | undefined

    const isSender = this.isAddressEqual(activityAddress, txFromAddress)
    const isRecipient = this.isAddressEqual(activityAddress, txToAddress)

    if (isSender) {
      type = 'out'
    } else if (isRecipient) {
      type = 'in'
    }

    if (!type) {
      throw new Error(`Unable to resolve balanceActivity type, address = ${activityAddress}, txHash=${txHash}`)
    }

    return type
  }

  getBalanceActivityForNonTokenTransfer(address: string, tx: NormalizedTxEthereum): BalanceActivity {
    const { fromAddress, toAddress } = this.getFromAndToAddressFromTx(tx)

    const type = this.getActivityType(address, { txFromAddress: fromAddress, txToAddress: toAddress, txHash: tx.txid })

    const timestamp = new Date(tx.blockTime * 1000)

    const balanceActivity: BalanceActivity = {
      type,
      networkType: this.networkType,
      networkSymbol: this.coinSymbol,
      assetSymbol: this.coinSymbol,
      address,
      externalId: tx.txid,
      activitySequence: String(tx.ethereumSpecific.nonce),
      confirmationId: tx.blockHash ?? '',
      confirmationNumber: tx.blockHeight,
      timestamp,
      amount: this.toMainDenomination(tx.value),
      extraId: null,
      confirmations: tx.confirmations,
    }

    return balanceActivity
  }

  async txToBalanceActivity(
    address: string,
    tx: NormalizedTxEthereum,
  ): Promise<BalanceActivity | BalanceActivity[] | null> {
    if (!tx.tokenTransfers || tx.tokenTransfers.length === 0) {
      return this.getBalanceActivityForNonTokenTransfer(address, tx)
    }

    const nonce = String(tx.ethereumSpecific.nonce)
    const txHash = tx.txid

    const timestamp = new Date(tx.blockTime * 1000)

    const balanceActivities = tx.tokenTransfers
      .filter(tokenTransfer => {
        // we only care about token transfers where our known address is the sender or recipient
        const isSender = this.isAddressEqual(tokenTransfer.from, address)
        const isRecipient = this.isAddressEqual(tokenTransfer.to, address)

        return isSender || isRecipient
      })
      .map(tokenTransfer => {
        const type = this.getActivityType(address, {
          txFromAddress: tokenTransfer.from,
          txToAddress: tokenTransfer.to,
          txHash,
        })

        const unitConverter = this.getCustomUnitConverter(tokenTransfer.decimals)

        const balanceActivity: BalanceActivity = {
          type,
          networkType: this.networkType,
          networkSymbol: this.coinSymbol,
          assetSymbol: tokenTransfer.symbol,
          address,
          externalId: txHash,
          activitySequence: nonce,
          confirmationId: tx.blockHash ?? '',
          confirmationNumber: tx.blockHeight,
          timestamp,
          amount: unitConverter.toMainDenominationString(tokenTransfer.value),
          extraId: null,
          confirmations: tx.confirmations,
        }

        return balanceActivity
      })

    return balanceActivities
  }

  async subscribeNewBlock(callbackFn: NewBlockCallback): Promise<void> {
    await this.networkData.subscribeNewBlock(callbackFn)
  }
}
