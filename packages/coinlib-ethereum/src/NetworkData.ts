import { AutoFeeLevels, BlockInfo, FunctionPropertyNames, NewBlockCallback } from '@bitaccess/coinlib-common'
import { Logger, DelegateLogger } from '@faast/ts-common'
import { BigNumber } from 'bignumber.js'
import { GetAddressDetailsOptions, NormalizedTxEthereum } from 'blockbook-client'
import * as request from 'request-promise-native'
import { TransactionConfig } from 'web3-core'

import { DEFAULT_GAS_PRICE_IN_WEI, GAS_STATION_URL, GAS_STATION_FEE_SPEED } from './constants'
import {
  EthereumNetworkDataProvider,
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

  callBlockbookWithWeb3Fallback<K extends FunctionPropertyNames<EthereumNetworkDataProvider>>(
    methodName: K,
    ...args: Parameters<EthereumNetworkDataProvider[K]>
  ): ReturnType<EthereumNetworkDataProvider[K]> {
    // Typescript compiler doesn't support spreading arguments that have a generic type, so the method
    // must be cast to a plain Function before invocation to avoid error ts(2556)
    try {
      return (this.blockBookService[methodName] as Function)(...args)
    } catch (error) {
      this.logger.log(`Call to blockbook ${methodName} failed, Falling back to web3`, error)

      return (this.web3Service[methodName] as Function)(...args)
    }
  }

  async getBlock(blockId: string | number): Promise<BlockInfo> {
    return this.callBlockbookWithWeb3Fallback('getBlock', blockId)
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
    return this.callBlockbookWithWeb3Fallback('getERC20Transaction', txId, tokenAddress)
  }

  async getTransaction(txId: string): Promise<EthereumStandardizedTransaction> {
    return this.callBlockbookWithWeb3Fallback('getTransaction', txId)
  }

  async getCurrentBlockNumber() {
    return this.callBlockbookWithWeb3Fallback('getCurrentBlockNumber')
  }

  async getAddressBalance(address: string) {
    return this.callBlockbookWithWeb3Fallback('getAddressBalance', address)
  }

  async getAddressBalanceERC20(address: string, tokenAddress: string) {
    return this.callBlockbookWithWeb3Fallback('getAddressBalanceERC20', address, tokenAddress)
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

  async subscribeAddresses(
    addresses: string[],
    txToBalanceActivityCallback: (address: string, rawTx: NormalizedTxEthereum) => Promise<void>,
  ) {
    const api = this.blockBookService.getApi()

    await api.subscribeAddresses(addresses, async ({ address, tx }) => {
      await txToBalanceActivityCallback(address, tx as NormalizedTxEthereum)
    })
  }

  async subscribeNewBlock(callbackFn: NewBlockCallback) {
    await this.blockBookService.getApi().subscribeNewBlock(callbackFn)
  }

  async _retryDced<T>(fn: () => Promise<T>): Promise<T> {
    return retryIfDisconnected(fn, this.logger)
  }
}
