import {
  BlockInfo,
  BalanceActivity,
  BalanceActivityCallback,
  BalanceMonitor,
  FilterBlockAddressesCallback,
  GetBalanceActivityOptions,
  RetrieveBalanceActivitiesResult,
  NewBlockCallback,
  BigNumber,
} from '@bitaccess/coinlib-common'
import { isUndefined, Numeric, isString } from '@bitaccess/ts-common'

import { AddressDetailsEthereumTxs, NormalizedTxEthereum } from 'blockbook-client'
import { EventEmitter } from 'events'
import { get } from 'lodash'
import { BALANCE_ACTIVITY_EVENT } from './constants'
import { EthereumPaymentsUtils } from './EthereumPaymentsUtils'
import { EthereumStandardizedTransaction } from './types'
import { getBlockBookTxFromAndToAddress } from './utils'

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

  async subscribeAddresses(addresses: string[]): Promise<void> {
    const validAddresses = addresses.filter(address => this.standardizeAddressOrThrow(address))

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
    address = this.standardizeAddressOrThrow(address)
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

      if (transactionPage?.page !== page) {
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

        const balanceActivities = await this.txToBalanceActivity(address, tx)

        await callbackFn(balanceActivities, tx)
      }

      lastTx = transactions[transactions.length - 1]
      page++
    }

    return { from: from.toString(), to: to.toString() }
  }

  private async getAllInvolvedAddresses(
    tx: EthereumStandardizedTransaction,
    cache: { [txid: string]: NormalizedTxEthereum },
  ) {
    const involvedAddresses = new Set(
      [tx.from, tx.to]
        .map((a) => this.standardizeAddressOrThrow(a))
    )

    const rawTx = await this.getTxWithMemoization(tx.txHash, cache)

    if (rawTx.tokenTransfers) {
      for (const tokenTransfer of rawTx.tokenTransfers) {
        involvedAddresses.add(this.standardizeAddressOrThrow(tokenTransfer.from))
        involvedAddresses.add(this.standardizeAddressOrThrow(tokenTransfer.to))
      }
    }

    return [...involvedAddresses]
  }

  async retrieveBlockBalanceActivities(
    blockId: string | number,
    callbackFn: BalanceActivityCallback,
    filterRelevantAddresses: FilterBlockAddressesCallback,
  ): Promise<BlockInfo> {
    const blockDetails: BlockInfo = await this.networkData.getBlock(blockId, true)

    const transactions = get(blockDetails.raw, 'transactions', []) as EthereumStandardizedTransaction[]
    const addressTransactions: { [address: string]: Set<EthereumStandardizedTransaction> } = {}

    /**
     * The standardized tx may or may not contain the token transfers depending on which data source
     * was used to fetch the NetworkData, so we need to do a hard lookup from the blockbook api for each tx, then also memoize
     */
    const hardTxQueries: { [txid: string]: NormalizedTxEthereum } = {}

    for (const tx of transactions) {
      // need to unwind all addresses involved in the tx, not just the from and to alone.
      const involvedAddresses = await this.getAllInvolvedAddresses(tx, hardTxQueries)

      for (const involvedAddress of involvedAddresses) {
        addressTransactions[involvedAddress] = (addressTransactions[involvedAddress] ?? new Set()).add(tx)
      }
    }

    const relevantAddresses = await filterRelevantAddresses(Array.from(Object.keys(addressTransactions)), {
      ...blockDetails,
      page: 1,
    })

    for (let relevantAddress of relevantAddresses) {
      relevantAddress = this.standardizeAddressOrThrow(relevantAddress)
      const relevantAddressTransactions = addressTransactions[relevantAddress]
      for (const { txHash } of relevantAddressTransactions) {
        const rawTx = await this.getTxWithMemoization(txHash, hardTxQueries)

        const balanceActivities = await this.txToBalanceActivity(relevantAddress, rawTx)

        await callbackFn(balanceActivities, rawTx)
      }
    }

    return blockDetails
  }

  private getActivityType(
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

  private getSelfBalanceActivities(baseBalanceActivity: BalanceActivity, fee: BigNumber) {
    const inBalanceActivityEntry: BalanceActivity = {
      ...baseBalanceActivity,
      type: 'in',
    }
    const outBalanceActivityEntry: BalanceActivity = {
      ...baseBalanceActivity,
      type: 'out',
      amount: new BigNumber(baseBalanceActivity.amount).negated().toString(),
    }

    const feeBalanceActivityEntry: BalanceActivity = {
      ...baseBalanceActivity,
      type: 'fee',
      amount: this.toMainDenomination(fee.negated()),
    }

    return [inBalanceActivityEntry, outBalanceActivityEntry, feeBalanceActivityEntry]
  }

  private getBalanceActivityForNonTokenTransfer(
    address: string,
    tx: NormalizedTxEthereum,
    fee: BigNumber,
  ): BalanceActivity[] {
    const { fromAddress, toAddress } = getBlockBookTxFromAndToAddress(tx)

    const timestamp = new Date(tx.blockTime * 1000)

    const baseBalanceActivity: BalanceActivity = {
      networkType: this.networkType,
      networkSymbol: this.coinSymbol,
      assetSymbol: this.coinSymbol,
      address: this.standardizeAddressOrThrow(address),
      externalId: tx.txid,
      activitySequence: String(tx.ethereumSpecific.nonce),
      confirmationId: tx.blockHash ?? '',
      confirmationNumber: tx.blockHeight,
      timestamp,
      amount: this.toMainDenomination(tx.value),
      extraId: null,
      confirmations: tx.confirmations,
      type: 'fee', // this will eventually be replaced by the correct type
    }

    // it is possible for fromAddress = toAddress, etherscan.io describes this as a "self" transaction.
    if (this.isAddressEqual(fromAddress, toAddress)) {
      // in this case we'll return an in, out and fee balance activity
      return this.getSelfBalanceActivities(baseBalanceActivity, fee)
    }

    const type = this.getActivityType(address, { txFromAddress: fromAddress, txToAddress: toAddress, txHash: tx.txid })

    const balanceActivities: BalanceActivity[] = []

    const balanceActivityEntry: BalanceActivity = {
      ...baseBalanceActivity,
      type,
    }

    if (balanceActivityEntry.type === 'out') {
      // negate the amount
      balanceActivityEntry.amount = new BigNumber(balanceActivityEntry.amount).negated().toString()

      // add the fee balance activity as well;
      const feeBalanceActivityEntry: BalanceActivity = {
        ...baseBalanceActivity,
        type: 'fee',
        amount: this.toMainDenomination(fee.negated()),
      }

      balanceActivities.push(feeBalanceActivityEntry)
    }

    balanceActivities.push(balanceActivityEntry)

    return balanceActivities
  }

  async txToBalanceActivity(address: string, tx: NormalizedTxEthereum): Promise<BalanceActivity[]> {
    if (tx.blockHeight <= 0) {
      // NOTE not yet confirmed on blockbook
      return []
    }

    const fee = new BigNumber(tx.ethereumSpecific.gasPrice).multipliedBy(tx.ethereumSpecific.gasUsed)

    if (!tx.tokenTransfers || tx.tokenTransfers.length === 0) {
      return this.getBalanceActivityForNonTokenTransfer(address, tx, fee)
    }

    const nonce = String(tx.ethereumSpecific.nonce)
    const txHash = tx.txid

    const timestamp = new Date(tx.blockTime * 1000)

    const balanceActivities: BalanceActivity[] = tx.tokenTransfers
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
          address: this.standardizeAddressOrThrow(address),
          externalId: txHash,
          activitySequence: nonce,
          confirmationId: tx.blockHash ?? '',
          confirmationNumber: tx.blockHeight,
          timestamp,
          amount: unitConverter.toMainDenominationString(tokenTransfer.value),
          extraId: null,
          confirmations: tx.confirmations,
          tokenAddress: this.standardizeAddressOrThrow(tokenTransfer.token),
        }

        if (balanceActivity.type === 'out') {
          balanceActivity.amount = new BigNumber(balanceActivity.amount).negated().toString()
        }

        return balanceActivity
      })

    const { fromAddress } = getBlockBookTxFromAndToAddress(tx)
    const isTxSender = this.isAddressEqual(fromAddress, address)

    if (isTxSender) {
      // add the balance activity for the fee
      const feeBalanceActivityEntry: BalanceActivity = {
        networkType: this.networkType,
        networkSymbol: this.coinSymbol,
        assetSymbol: this.coinSymbol,
        address: this.standardizeAddressOrThrow(address),
        externalId: tx.txid,
        activitySequence: String(tx.ethereumSpecific.nonce),
        confirmationId: tx.blockHash ?? '',
        confirmationNumber: tx.blockHeight,
        timestamp,
        extraId: null,
        confirmations: tx.confirmations,
        type: 'fee',
        amount: this.toMainDenomination(fee.negated()),
      }

      balanceActivities.push(feeBalanceActivityEntry)
    }

    return balanceActivities
  }

  async subscribeNewBlock(callbackFn: NewBlockCallback): Promise<void> {
    await this.networkData.subscribeNewBlock(callbackFn)
  }
}
