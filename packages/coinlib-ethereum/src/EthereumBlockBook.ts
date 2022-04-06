import { BlockInfo, TransactionStatus } from '@bitaccess/coinlib-common'
import { Logger } from '@faast/ts-common'
import { BlockbookEthereum, GetAddressDetailsOptions, NormalizedTxEthereum } from 'blockbook-client'
import { MIN_CONFIRMATIONS } from './constants'

import { EthereumBlockbookConnectedConfig, EthereumTransactionInfo } from './types'
import { UnitConvertersUtil } from './UnitConvertersUtil'
import { handleException, retryIfDisconnected, resolveServer } from './utils'

export class EthereumBlockbook extends UnitConvertersUtil {
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

  async getBlock(id?: string | number): Promise<BlockInfo | null> {
    return this._handleException(async () => {
      const blockId = id ?? (await this.getCurrentBlockNumber())

      if (!blockId) {
        return null
      }

      const raw = await this._retryDced(() => this.api.getBlock(blockId))

      const blockInfo: BlockInfo = {
        height: raw.height,
        id: raw.hash,
        previousId: raw.previousBlockHash,
        time: new Date(Number(raw.time) * 1000),
        raw,
      }

      return blockInfo
    })
  }

  async getCurrentBlockNumber() {
    const bestBlock = await this._handleException(() => {
      return this._retryDced(() => this.api.getBestBlock())
    })

    if (!bestBlock) {
      return null
    }

    return bestBlock.height
  }

  async getTransaction(txId: string): Promise<NormalizedTxEthereum | null> {
    return this._handleException(() => {
      return this._retryDced(() => this.api.getTx(txId))
    }, 'getTransaction')
  }

  async getAddressDetails(address: string, options?: GetAddressDetailsOptions) {
    return this._handleException(async () => {
      return this._retryDced(() => this.api.getAddressDetails(address, options))
    }, 'getAddressDetails')
  }

  async getTransactionInfo(txId: string): Promise<EthereumTransactionInfo | null> {
    return this._handleException(async () => {
      const tx = await this.getTransaction(txId)

      if (!tx) {
        return null
      }

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
    }, 'getTransactionInfo')
  }

  async _retryDced<T>(fn: () => Promise<T>, additionalRetryableErrors?: string[]): Promise<T> {
    return retryIfDisconnected(fn, this.logger, additionalRetryableErrors)
  }

  async _handleException<T>(fn: () => Promise<T>, logPrefix?: string): Promise<T | null> {
    const LOG_PREFIX = `EthereumBlockbook:${logPrefix ?? ''}`

    return handleException(fn, this.logger, LOG_PREFIX)
  }
}
