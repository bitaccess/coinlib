import {
  UtxoInfo,
  BalanceActivity,
  BalanceActivityCallback,
  BalanceMonitor,
  GetBalanceActivityOptions,
  RetrieveBalanceActivitiesResult,
  NetworkType,
  createUnitConverters,
  NewBlockCallback,
  FilterBlockAddressesCallback,
  BlockInfo,
  BigNumber,
} from '@bitaccess/coinlib-common'
import { EventEmitter } from 'events'
import {
  AddressDetailsBitcoinTxs,
  NormalizedTxBitcoin,
  NormalizedTxBitcoinVin,
  NormalizedTxBitcoinVinWithCoinbase,
  NormalizedTxBitcoinVout,
} from 'blockbook-client'
import { isUndefined, Numeric } from '@faast/ts-common'

import { BitcoinishBalanceMonitorConfig, BitcoinishBlock } from './types'
import { BlockbookConnected } from './BlockbookConnected'
import { BitcoinishPaymentsUtils } from './BitcoinishPaymentsUtils'
import { omit } from 'lodash'

export abstract class BitcoinishBalanceMonitor extends BlockbookConnected implements BalanceMonitor {

  readonly coinName: string
  readonly coinSymbol: string
  readonly utils: BitcoinishPaymentsUtils
  readonly events = new EventEmitter()

  constructor(config: BitcoinishBalanceMonitorConfig) {
    super(config)
    this.utils = config.utils
    this.coinName = config.utils.coinName
    this.coinSymbol = config.utils.coinSymbol
  }

  async destroy() {
    this.events.removeAllListeners('tx')
    await super.destroy()
  }

  async subscribeAddresses(addresses: string[]) {
    for (const address of addresses) {
      this.utils.validateAddress(address)
    }
    await this.getApi().subscribeAddresses(addresses, async ({ address, tx }) => {
      this.events.emit('tx', { address, tx })
      const activity = await this.txToBalanceActivity(address, tx as NormalizedTxBitcoin)
      if (activity) {
        this.events.emit('activity', { activity, tx })
      }
    })
  }

  async subscribeNewBlock(callbackFn: NewBlockCallback): Promise<void> {
    await this.getApi().subscribeNewBlock(callbackFn)
  }

  onBalanceActivity(callbackFn: BalanceActivityCallback) {
    this.events.on('activity', ({ activity, tx }) => {
      callbackFn(activity, tx)
        ?.catch((e) => this.logger.error(
          `Error in ${this.coinSymbol} ${this.networkType} onBalanceActivity callback`,
          e,
        ))
    })
  }

  private accumulateAddressTx(
    addressTransactions: { [address: string]: Set<NormalizedTxBitcoin> },
    tx: NormalizedTxBitcoin,
    inout: NormalizedTxBitcoinVin | NormalizedTxBitcoinVinWithCoinbase | NormalizedTxBitcoinVout,
  ) {
    if (!(inout.isAddress && inout.addresses?.length)) {
      return
    }

    const address = this.utils.standardizeAddress(inout.addresses[0])
    if (address === null) {
      return
    }

    (addressTransactions[address] = addressTransactions[address] ?? new Set()).add(tx)
  }

  async retrieveBlockBalanceActivities(
    blockId: number | string,
    callbackFn: BalanceActivityCallback,
    filterRelevantAddresses: FilterBlockAddressesCallback,
  ): Promise<BlockInfo> {
    let page = 1
    let blockRaw: BitcoinishBlock | undefined
    let blockInfoResult: BlockInfo | undefined
    while(!blockRaw || blockRaw.page < blockRaw.totalPages) {
      const getBlockResult = await this.utils.getBlock(blockId, { page, includeTxs: true })
      blockInfoResult = omit(getBlockResult, ['raw.txs']) as BlockInfo // omit large tx list from returned/cb value
      blockRaw = getBlockResult.raw as BitcoinishBlock
      if (!blockRaw?.txs) {
        this.logger.log(`No transactions returned for page ${page} of block ${blockId}`)
        break
      }
      // Aggregate all block txs by the addresses they apply to
      const addressTransactions: { [address: string]: Set<NormalizedTxBitcoin> } = {}
      for (const tx of blockRaw.txs) {
        for (const input of tx.vin) {
          this.accumulateAddressTx(addressTransactions, tx, input)
        }
        for (const output of tx.vout) {
          this.accumulateAddressTx(addressTransactions, tx, output)
        }
      }
      // Emit events for all address/tx combinations
      const relevantAddresses = new Set<string>(
        await filterRelevantAddresses(
          Array.from(Object.keys(addressTransactions)),
          { ...blockInfoResult, page },
        )
      )
      /**
       * Block tx data doesn't always include input txids which is needed for determining utxosSpent.
       * Hard lookup is needed for each tx, memoize to avoid redundant lookups.
       */
      const hardTxQueries: { [txid: string]: NormalizedTxBitcoin } = {}
      for (const address of relevantAddresses) {
        const txs = addressTransactions[address] ?? []
        for (const { txid } of txs) {
          const tx = (hardTxQueries[txid] ??= await this._retryDced(() => this.getApi().getTx(txid)))
          const activity = await this.txToBalanceActivity(address, tx)
          if (activity) {
            await callbackFn(activity, tx)
          }
        }
      }
      page++
    }
    return blockInfoResult!
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
    const limit = 10
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
          await callbackFn(activity, tx)
        }
      }
      lastTx = transactions[transactions.length - 1]
      page++
    }
    return { from: from.toString(), to: to.toString() }
  }

  private extractStandardAddress(v: NormalizedTxBitcoinVout | NormalizedTxBitcoinVinWithCoinbase | NormalizedTxBitcoinVin): string | null {
    const address = v.isAddress && v.addresses?.[0]
    return address ? this.utils.standardizeAddress(address) : null
  }

  async txToBalanceActivity(address: string, tx: NormalizedTxBitcoin): Promise<BalanceActivity | null> {
    const externalId = tx.txid
    const confirmationNumber = tx.blockHeight
    const standardizedAddress = this.utils.standardizeAddress(address)
    if (standardizedAddress === null) {
      this.logger.warn(`Cannot standardize ${this.coinName} address, likely invalid: ${address}`)
      return null
    }

    let netSatoshis = new BigNumber(0) // balance increase (positive), or decreased (negative)
    const utxosSpent: UtxoInfo[] = []
    const utxosCreated: UtxoInfo[] = []

    for (const input of tx.vin) {
      // sometimes input.value can be undefined for coinbase block
      if (!input.value) {
        input.value = '0'
      }
      if (this.extractStandardAddress(input) === standardizedAddress) {
        netSatoshis = netSatoshis.minus(input.value)
        const inputTxid = input.txid
        if (!inputTxid) {
          this.logger.log(`Tx ${tx.txid} input ${input.n} has no txid or vout`, input)
          continue
        }
        const vout = input.vout ?? 0
        const inputTxInfo = await this._retryDced(() => this.getApi().getTx(inputTxid))
        const output = inputTxInfo.vout[vout]
        utxosSpent.push({
          txid: inputTxid,
          vout, // vout might be missing when 0
          satoshis: new BigNumber(input.value).toNumber(),
          value: this.utils.toMainDenominationString(input.value),
          confirmations: inputTxInfo.confirmations,
          height: inputTxInfo.blockHeight > 0 ? String(inputTxInfo.blockHeight) : undefined,
          coinbase: !input.isAddress && input.value === '0',
          lockTime: inputTxInfo.lockTime ? String(inputTxInfo.lockTime) : undefined,
          txHex: inputTxInfo.hex,
          scriptPubKeyHex: output.hex,
          address: standardizedAddress,
          spent: true,
        })
      }
    }
    for (const output of tx.vout) {
      if (this.extractStandardAddress(output) === standardizedAddress) {
        netSatoshis = netSatoshis.plus(output.value)
        utxosCreated.push(this.utils.txVoutToUtxoInfo(tx, output))
      }
    }

    if (!(utxosSpent.length || utxosCreated.length)) {
      // Theoretically, netSatoshis could be 0, however unlikely, and the tx may still affect the address' utxos.
      // Only return null if the tx has no effect on the address' utxos.
      this.logger.log(
        `${this.coinName} transaction ${externalId} does not affect balance of ${standardizedAddress}`,
        tx,
      )
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
      confirmationNumber: confirmationNumber > 0 ? confirmationNumber : -1,
      confirmations: tx.confirmations,
      timestamp: new Date(tx.blockTime * 1000),
      utxosSpent,
      utxosCreated,
    }
  }

}
