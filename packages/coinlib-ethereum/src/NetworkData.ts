import * as request from 'request-promise-native'
import { BigNumber } from 'bignumber.js'
import { Logger, DelegateLogger } from '@faast/ts-common'
import { TransactionConfig } from 'web3-core'
import { AutoFeeLevels, BlockInfo } from '@bitaccess/coinlib-common'
import { GetAddressDetailsOptions } from 'blockbook-client'

import { DEFAULT_GAS_PRICE_IN_WEI, GAS_STATION_URL, GAS_STATION_FEE_SPEED } from './constants'
import {
  EthereumStandardizedERC20Transaction,
  EthereumStandardizedTransaction,
  EthTxType,
  NetworkDataConfig,
} from './types'
import { retryIfDisconnected } from './utils'
import { NetworkDataBlockbook } from './NetworkDataBlockbook'
import { NetworkDataWeb3 } from './NetworkDataWeb3'

export class NetworkData {
  private gasStationUrl: string | undefined
  private parityUrl: string | undefined
  private logger: Logger
  private blockBookService: NetworkDataBlockbook
  private web3Service: NetworkDataWeb3

  constructor(config: NetworkDataConfig) {
    this.gasStationUrl = config.gasStationUrl ?? GAS_STATION_URL
    this.logger = new DelegateLogger(config.logger, 'NetworkData')

    this.blockBookService = new NetworkDataBlockbook({
      ...config.blockBookConfig,
      server: config.blockBookConfig.nodes,
      logger: this.logger,
      decimals: config.web3Config.decimals,
    })

    this.web3Service = new NetworkDataWeb3({
      ...config.web3Config,
      logger: this.logger,
    })

    this.parityUrl = config.parityUrl
  }

  async connectBlockBook(): Promise<void> {
    await this.blockBookService.init()
  }

  async disconnectBlockBook(): Promise<void> {
    await this.blockBookService.destroy()
  }

  standardizeBlockBookTransaction(tx: NormalizedTxEthereum, blockInfoTime?: Date): EthereumStandardizedTransaction {
    if (tx.vin.length !== 1 || tx.vout.length !== 1) {
      throw new Error('transaction has less or more than one input or output')
    }

    const inputAddresses = tx.vin[0].addresses
    const outputAddresses = tx.vout[0].addresses

    if (!inputAddresses || !outputAddresses) {
      throw new Error('transaction is missing from or to address')
    }

    const blockTime = blockInfoTime ? new Date(blockInfoTime) : new Date(tx.blockTime * 1000)

    const standardizedTransaction: EthereumStandardizedTransaction = {
      blockHash: tx.blockHash!,
      blockHeight: tx.blockHeight,
      blockTime,
      from: inputAddresses[0],
      nonce: tx.ethereumSpecific.nonce,
      to: outputAddresses[0],
      txHash: tx.txid,
      value: tx.value,
      confirmations: tx.confirmations,
    }

    return standardizedTransaction
  }

  standardizeBlockInfoRaw(blockInfo: BlockInfo) {
    if (!blockInfo.raw) {
      return
    }

    const dataProvider = get(blockInfo.raw, 'dataProvider')

    if (dataProvider === NETWORK_DATA_PROVIDERS.BLOCKBOOK) {
      const blockRaw = blockInfo.raw as BlockInfoEthereum
      const blockTime = new Date(blockInfo.time)

      const standardizedTransactions = (blockRaw.txs ?? []).map((tx: NormalizedTxEthereum) =>
        this.standardizeBlockBookTransaction(tx, blockTime),
      )

      return {
        ...blockRaw,
        transactions: standardizedTransactions,
      }
    }

    if (dataProvider === NETWORK_DATA_PROVIDERS.INFURA) {
      const blockRaw = blockInfo.raw as BlockTransactionObject

      const standardizedTransactions = blockRaw.transactions.map(tx => {
        const standardizedTransaction: EthereumStandardizedTransaction = {
          from: tx.from,
          to: tx.to!,
          blockHash: tx.blockHash!,
          blockHeight: tx.blockNumber!,
          blockTime: new Date(blockInfo.time),
          nonce: tx.nonce,
          txHash: tx.hash,
          value: tx.value,
        }

        return standardizedTransaction
      })

      return {
        ...blockRaw,
        transactions: standardizedTransactions,
      }
    }

    return blockInfo.raw
  }

  async subscribeAddresses(
    addresses: string[],
    txToBalanceActivityCallback: (
      address: string,
      standardizedTx: EthereumStandardizedTransaction,
      rawTx: NormalizedTxEthereum,
    ) => Promise<void>,
  ) {
    const api = this.blockBookService.getApi()

    await api.subscribeAddresses(addresses, async ({ address, tx }) => {
      const standardizedTx = this.standardizeBlockBookTransaction(tx as NormalizedTxEthereum)

      await txToBalanceActivityCallback(address, standardizedTx, tx as NormalizedTxEthereum)
    })
  }

  async subscribeNewBlock(callbackFn: NewBlockCallback) {
    await this.blockBookService.getApi().subscribeNewBlock(callbackFn)
  }

  async getBlock(blockId: string | number): Promise<BlockInfo> {
    let blockInfo: BlockInfo | undefined

    try {
      blockInfo = await this.blockBookService.getBlock(blockId)
    } catch (error) {
      this.logger.log('Request to blockbook getBlock failed, Falling back to web3 ', error)

      blockInfo = await this.web3Service.getBlock(blockId)
    }

    return {
      ...blockInfo,
      raw: this.standardizeBlockInfoRaw(blockInfo),
    }
  }

  async getAddressDetails(address: string, options?: GetAddressDetailsOptions) {
    return this.blockBookService.getAddressDetails(address, options)
  }

  async getGasAndNonceForNewTx(
    txType: EthTxType,
    speed: AutoFeeLevels,
    from: string,
    to: string,
    data?: string,
  ): Promise<{
    pricePerGasUnit: string
    nonce: string
    amountOfGas: number
  }> {
    const pricePerGasUnit = await this.getGasPrice(speed)
    const nonce = await this.getNonce(from)
    const amountOfGas = await this.estimateGas({ from, to, data }, txType)

    return {
      pricePerGasUnit,
      amountOfGas,
      nonce,
    }
  }

  async getNonce(address: string): Promise<string> {
    const web3Nonce = (await this.web3Service.getWeb3Nonce(address)) || '0'
    const parityNonce = (await this.getParityNonce(address)) || '0'

    const nonce = BigNumber.maximum(web3Nonce, parityNonce)
    return nonce.toNumber() ? nonce.toString() : '0'
  }

  async getGasPrice(speed: AutoFeeLevels): Promise<string> {
    let gasPrice = await this.getGasStationGasPrice(speed)
    if (gasPrice) return gasPrice

    gasPrice = await this.web3Service.getWeb3GasPrice()
    if (gasPrice) return gasPrice

    return DEFAULT_GAS_PRICE_IN_WEI
  }

  async estimateGas(txObject: TransactionConfig, txType: EthTxType): Promise<number> {
    return this.web3Service.estimateGas(txObject, txType)
  }

  async getERC20Transaction(txId: string, tokenAddress: string): Promise<EthereumStandardizedERC20Transaction> {
    try {
      return this.blockBookService.getERC20Transaction(txId, tokenAddress)
    } catch (error) {
      this.logger.log('Request to blockbook getERC20Transaction failed, Falling back to web3 ', error)

      return this.web3Service.getERC20Transaction(txId, tokenAddress)
    }
  }

  async getTransaction(txId: string): Promise<EthereumStandardizedTransaction> {
    try {
      return this.blockBookService.getTransaction(txId)
    } catch (error) {
      this.logger.log('Request to blockbook getTransaction failed, Falling back to web3 ', error)

      return this.web3Service.getTransaction(txId)
    }
  }

  async getCurrentBlockNumber() {
    try {
      return this.blockBookService.getCurrentBlockNumber()
    } catch (error) {
      this.logger.log('Request to blockbook getCurrentBlockNumber failed, Falling back to web3 ', error)

      return this.web3Service.getCurrentBlockNumber()
    }
  }

  async getAddressBalance(address: string) {
    try {
      return this.blockBookService.getAddressBalance(address)
    } catch (error) {
      this.logger.log('Request to blockbook getAddressBalance failed, Falling back to web3 ', error)

      return this.web3Service.getAddressBalance(address)
    }
  }

  async getAddressBalanceERC20(address: string, tokenAddress: string) {
    try {
      return this.blockBookService.getAddressBalanceERC20(address, tokenAddress)
    } catch (error) {
      this.logger.log('Request to blockbook getAddressBalanceERC20 failed, Falling back to web3 ', error)

      return this.web3Service.getAddressBalanceERC20(address, tokenAddress)
    }
  }

  private async getParityNonce(address: string): Promise<string> {
    const data = {
      method: 'parity_nextNonce',
      params: [address],
      id: 1,
      jsonrpc: '2.0',
    }
    const options = {
      url: this.parityUrl || '',
      json: data,
    }

    let body: { [key: string]: string }
    try {
      body = await request.post(options)
    } catch (e) {
      this.logger.warn('Failed to retrieve nonce from parity - ', e.toString())
      return ''
    }
    if (!body || !body.result) {
      this.logger.warn('Bad result or missing fields in parity nextNonce response', body)
      return ''
    }

    return new BigNumber(body.result, 16).toString()
  }

  private async getGasStationGasPrice(level: AutoFeeLevels): Promise<string> {
    const hasKey = /\?api-key=/.test(this.gasStationUrl || '')
    const options = {
      url: hasKey ? `${this.gasStationUrl}` : `${this.gasStationUrl}/json/ethgasAPI.json`,
      json: true,
      timeout: 5000,
    }
    let body: { [key: string]: number }
    try {
      body = await this._retryDced(() => request.get(options))
    } catch (e) {
      this.logger.warn('Failed to retrieve gas price from ethgasstation - ', e.toString())
      return ''
    }
    const speed = GAS_STATION_FEE_SPEED[level]
    if (!(body && body.blockNum && body[speed])) {
      this.logger.warn('Bad result or missing fields in ethgasstation response', body)
      return ''
    }

    const price10xGwei = body[speed]

    const gwei = new BigNumber(price10xGwei).dividedBy(10)
    this.logger.log(`Retrieved gas price of ${gwei} Gwei from ethgasstation using speed ${speed}`)
    return gwei
      .multipliedBy(1e9)
      .dp(0, BigNumber.ROUND_DOWN)
      .toFixed()
  }

  async _retryDced<T>(fn: () => Promise<T>): Promise<T> {
    return retryIfDisconnected(fn, this.logger)
  }
}
