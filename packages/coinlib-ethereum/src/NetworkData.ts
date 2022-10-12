import { AutoFeeLevels, BlockInfo, FunctionPropertyNames, NewBlockCallback, BigNumber } from '@bitaccess/coinlib-common'
import { Logger, DelegateLogger, Numeric } from '@bitaccess/ts-common'
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
  private logger: Logger
  blockBookService: NetworkDataBlockbook
  web3Service: NetworkDataWeb3

  blockbookEnabled = false

  constructor(config: NetworkDataConfig) {
    this.gasStationUrl = config.gasStationUrl ?? GAS_STATION_URL
    this.logger = new DelegateLogger(config.logger, 'NetworkData')

    this.blockBookService = new NetworkDataBlockbook({
      ...config.blockBookConfig,
      server: config.blockBookConfig.nodes,
      logger: this.logger,
    })
    this.blockbookEnabled = Boolean(this.blockBookService.api)

    this.web3Service = new NetworkDataWeb3({
      ...config.web3Config,
      logger: this.logger,
    })
  }

  async connectBlockBook(): Promise<void> {
    await this.blockBookService.init()
  }

  async disconnectBlockBook(): Promise<void> {
    await this.blockBookService.destroy()
  }

  async callBlockbookWithWeb3Fallback<K extends FunctionPropertyNames<EthereumNetworkDataProvider>>(
    methodName: K,
    ...args: Parameters<EthereumNetworkDataProvider[K]>
  ): Promise<ReturnType<EthereumNetworkDataProvider[K]>> {
    // Typescript compiler doesn't support spreading arguments that have a generic type, so the method
    // must be cast to a plain Function before invocation to avoid error ts(2556)
    if (!this.blockbookEnabled) {
      return await (this.web3Service[methodName] as Function)(...args)
    }
    try {
      return await (this.blockBookService[methodName] as Function)(...args)
    } catch (error) {
      this.logger.log(`Call to blockbook ${methodName} failed, Falling back to web3`, error)
      return await (this.web3Service[methodName] as Function)(...args)
    }
  }

  async getBlock(blockId: string | number, includeTransactionObjects: boolean = false): Promise<BlockInfo> {
    return this.callBlockbookWithWeb3Fallback('getBlock', blockId, includeTransactionObjects)
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
    const nonce = await this.getNextNonce(from)
    const amountOfGas = await this.estimateGas({
      from,
      to,
      ...(data ? { data } : {}),
    }, txType)

    return {
      pricePerGasUnit,
      amountOfGas,
      nonce,
    }
  }

  private async fetchNonceOrZero(service: EthereumNetworkDataProvider, address: string): Promise<Numeric> {
    try {
      const nonceRaw = await service.getNextNonce(address)
      const nonceBn = new BigNumber(nonceRaw)
      return nonceBn.isNaN() ? 0 : nonceBn
    } catch (e) {
      this.logger.warn(`Failed to retrieve next nonce from ${service.constructor.name} - `, e.toString())
      return 0
    }
  }

  async getNextNonce(address: string): Promise<string> {
    const web3Nonce = await this.fetchNonceOrZero(this.web3Service, address)
    const blockbookNonce = this.blockbookEnabled
      ? await this.fetchNonceOrZero(this.blockBookService, address)
      : 0

    const nonce = BigNumber.maximum(web3Nonce, blockbookNonce, 0)
    return nonce.toString()
  }

  async getGasPrice(speed: AutoFeeLevels): Promise<string> {
    let gasPrice = await this.getGasStationGasPrice(speed)
    if (gasPrice) return gasPrice

    gasPrice = await this.web3Service.getGasPrice()
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

  async getTxRaw(txId: string) {
    const blockbookApi = this.blockBookService.getApi()

    return this._retryDced(() => blockbookApi.getTx(txId))
  }

  async subscribeAddresses(
    addresses: string[],
    callbackFn: (address: string, rawTx: NormalizedTxEthereum) => Promise<void>,
  ) {
    const api = this.blockBookService.getApi()

    await api.subscribeAddresses(addresses, async ({ address, tx }) => {
      await callbackFn(address, tx as NormalizedTxEthereum)
    })
  }

  async subscribeNewBlock(callbackFn: NewBlockCallback) {
    await this.blockBookService.getApi().subscribeNewBlock(callbackFn)
  }

  async _retryDced<T>(fn: () => Promise<T>): Promise<T> {
    return retryIfDisconnected(fn, this.logger)
  }
}
