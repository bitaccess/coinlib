import { BlockInfo, TransactionStatus } from '@bitaccess/coinlib-common'
import { Logger } from '@faast/ts-common'
import { BlockbookEthereum, GetAddressDetailsOptions, NormalizedTxEthereum } from 'blockbook-client'
import { MIN_CONFIRMATIONS } from './constants'

import { EthereumBlockbookConnectedConfig, EthereumTransactionInfo, EthereumNetworkDataProvider } from './types'
import { UnitConvertersUtil } from './UnitConvertersUtil'
import { retryIfDisconnected, resolveServer } from './utils'

export class NetworkDataBlockbook extends UnitConvertersUtil implements EthereumNetworkDataProvider {
  private logger: Logger
  private api: BlockbookEthereum

  constructor(config: EthereumBlockbookConnectedConfig) {
    super({ coinDecimals: config.decimals })
    this.logger = config.logger
    const { api } = resolveServer(config, this.logger)

    this.api = api
  }

  async init(): Promise<void> {
    await this.api.connect()
  }

  async destroy(): Promise<void> {
    await this.api.disconnect()
  }

  async getBlock(id?: string | number): Promise<BlockInfo> {
    const blockId = id ?? (await this.getCurrentBlockNumber())

    const raw = await this._retryDced(() => this.api.getBlock(blockId))

    const blockInfo: BlockInfo = {
      height: raw.height,
      id: raw.hash,
      previousId: raw.previousBlockHash,
      time: new Date(Number(raw.time) * 1000),
      raw,
    }

    return blockInfo
  }

  async getCurrentBlockNumber() {
    const bestBlock = await this._retryDced(() => this.api.getBestBlock())

    return bestBlock.height
  }

  async getTransaction(txId: string): Promise<NormalizedTxEthereum> {
    return this._retryDced(() => this.api.getTx(txId))
  }

  async getAddressDetails(address: string, options?: GetAddressDetailsOptions) {
    return this._retryDced(() => this.api.getAddressDetails(address, options))
  }

  async getTransactionInfo(txId: string): Promise<EthereumTransactionInfo> {
    const tx = await this.getTransaction(txId)

    const fromAddress = tx.vin[0].addresses[0].toLowerCase()
    const outputAddresses = tx.vout[0].addresses
    const toAddress = outputAddresses ? outputAddresses[0].toLowerCase() : null

    const currentBlockNumber = await this.getCurrentBlockNumber()

    if (!currentBlockNumber) {
      throw new Error('Failed to getCurrentBlockNumber')
    }

    let status: TransactionStatus = TransactionStatus.Pending
    let isExecuted = false

    // XXX it is suggested to keep 12 confirmations
    // https://ethereum.stackexchange.com/questions/319/what-number-of-confirmations-is-considered-secure-in-ethereum
    const isConfirmed = tx.confirmations > Math.max(MIN_CONFIRMATIONS, 12)

    if (isConfirmed) {
      status = TransactionStatus.Confirmed
      isExecuted = true
    }

    const result: EthereumTransactionInfo = {
      id: tx.txid,
      amount: this.toMainDenomination(tx.value),
      fromAddress,
      toAddress,
      fromExtraId: null,
      toExtraId: null,
      fromIndex: null,
      toIndex: null,
      fee: this.toMainDenomination(tx.fees),
      sequenceNumber: tx.ethereumSpecific.nonce,
      weight: tx.ethereumSpecific.gasUsed,
      isExecuted,
      isConfirmed,
      confirmations: tx.confirmations,
      confirmationId: tx.blockHash ?? null,
      confirmationTimestamp: new Date(Number(tx.blockTime) * 1000),
      confirmationNumber: tx.blockHeight,
      status,
      currentBlockNumber,
      data: {
        ...tx,
        currentBlock: currentBlockNumber,
      },
    }

    return result
  }

  async _retryDced<T>(fn: () => Promise<T>, additionalRetryableErrors?: string[]): Promise<T> {
    return retryIfDisconnected(fn, this.logger, additionalRetryableErrors)
  }
}
