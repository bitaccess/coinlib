import * as request from 'request-promise-native'
import { BigNumber } from 'bignumber.js'
import { Logger, DelegateLogger } from '@faast/ts-common'
import { TransactionConfig } from 'web3-core'
import { AutoFeeLevels, BlockInfo } from '@bitaccess/coinlib-common'
import { GetAddressDetailsOptions, NormalizedTxEthereum } from 'blockbook-client'

import {
  DEFAULT_GAS_PRICE_IN_WEI,
  GAS_STATION_URL,
  GAS_STATION_FEE_SPEED,
  MAXIMUM_GAS,
  GAS_ESTIMATE_MULTIPLIER,
  ETHEREUM_TRANSFER_COST,
} from './constants'
import { EthereumBlock, EthereumTransactionInfo, EthTxType, NetworkDataConfig } from './types'
import { retryIfDisconnected } from './utils'
import { EthereumBlockbook } from './EthereumBlockBook'
import { EthereumWeb3 } from './EthereumWeb3'

export class NetworkData {
  private gasStationUrl: string | undefined
  private parityUrl: string | undefined
  private logger: Logger
  private blockBookService: EthereumBlockbook
  private web3Service: EthereumWeb3

  constructor(config: NetworkDataConfig) {
    this.gasStationUrl = config.gasStationUrl ?? GAS_STATION_URL
    this.logger = new DelegateLogger(config.logger, 'NetworkData')

    this.blockBookService = new EthereumBlockbook({
      ...config.blockBookConfig,
      server: config.blockBookConfig.nodes,
      logger: this.logger,
      decimals: config.web3Config.decimals,
    })

    this.web3Service = new EthereumWeb3({
      ...config.web3Config,
      logger: this.logger,
    })

    this.parityUrl = config.parityUrl
  }

  async connectBlockBook(): Promise<void> {
    await this.blockBookService.init()
  }

  async disConnectBlockBook(): Promise<void> {
    await this.blockBookService.destroy()
  }

  async getBlock(blockId: string | number): Promise<BlockInfo> {
    try {
      return this.blockBookService.getBlock(blockId)
    } catch (error) {
      this.logger.log('An error occurred', error)

      return this.web3Service.getBlock(blockId)
    }
  }

  async getAddressDetails(address: string, options?: GetAddressDetailsOptions) {
    return this.blockBookService.getAddressDetails(address, options)
  }

  async getNetworkData(
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

  async getTransactionInfoERC20(txId: string, tokenAddress?: string): Promise<EthereumTransactionInfo> {
    return this.web3Service.getTransactionInfoERC20(txId, tokenAddress)
  }

  async getTransactionInfo(txId: string, tokenAddress?: string): Promise<EthereumTransactionInfo> {
    try {
      return this.blockBookService.getTransactionInfo(txId)
    } catch (error) {
      this.logger.log('An error occurred', error)

      return this.web3Service.getTransactionInfo(txId, tokenAddress)
    }
  }

  async getCurrentBlockNumber() {
    try {
      return this.blockBookService.getCurrentBlockNumber()
    } catch (error) {
      this.logger.log('An error occurred', error)

      return this.web3Service.getCurrentBlockNumber()
    }
  }

  async getAddressBalance(address: string) {
    return this.web3Service.getAddressBalance(address)
  }

  async getAddressBalanceERC20(address: string, tokenAddress: string) {
    return this.web3Service.getAddressBalanceERC20(address, tokenAddress)
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
