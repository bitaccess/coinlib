import * as request from 'request-promise-native'
import { BigNumber } from 'bignumber.js'
import Web3 from 'web3'
import { Logger, DelegateLogger } from '@faast/ts-common'
import { TransactionConfig } from 'web3-core'
import { AutoFeeLevels } from '@bitaccess/coinlib-common'
import { BlockbookEthereum, GetAddressDetailsOptions, NormalizedTxEthereum } from 'blockbook-client'

import {
  DEFAULT_GAS_PRICE_IN_WEI,
  GAS_STATION_URL,
  GAS_STATION_FEE_SPEED,
  MAXIMUM_GAS,
  GAS_ESTIMATE_MULTIPLIER,
  ETHEREUM_TRANSFER_COST,
} from './constants'
import { EthereumBlock, EthTxType } from './types'
import { resolveServer, retryIfDisconnected } from './utils'

type Eth = Web3['eth']

type NetworkDataConfig = {
  web3: { eth: Eth; gasStationUrl?: string }
  blockBook: { nodes: string[] | string | null; requestTimeoutMs?: number; api?: BlockbookEthereum }
  parity?: { parityUrl?: string }
  logger?: Logger | null
}

export class NetworkData {
  private gasStationUrl: string | undefined
  private parityUrl: string | undefined
  private eth: Eth
  private logger: Logger
  private blockBookApi: BlockbookEthereum

  constructor(config: NetworkDataConfig) {
    this.eth = config.web3.eth
    this.gasStationUrl = config.web3.gasStationUrl ?? GAS_STATION_URL
    this.logger = new DelegateLogger(config.logger, 'NetworkData')
    const { api } = resolveServer(
      {
        api: config.blockBook.api,
        server: config.blockBook.nodes,
        requestTimeoutMs: config.blockBook.requestTimeoutMs,
      },
      this.logger,
    )
    this.blockBookApi = api
    this.parityUrl = config.parity?.parityUrl
  }

  async connectBlockBook(): Promise<void> {
    await this.blockBookApi.connect()
  }

  async disConnectBlockBook(): Promise<void> {
    await this.blockBookApi.disconnect()
  }

  async getBlock(blockId: string | number, page?: number): Promise<EthereumBlock> {
    return this._retryDced(() => this.blockBookApi.getBlock(blockId, { page }))
  }

  async getAddressDetails(address: string, options?: GetAddressDetailsOptions) {
    return this._retryDced(() => this.blockBookApi.getAddressDetails(address, options))
  }

  async getTransaction(txId: string): Promise<NormalizedTxEthereum> {
    return this._retryDced(() => this.blockBookApi.getTx(txId))
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
    const web3Nonce = (await this.getWeb3Nonce(address)) || '0'
    const parityNonce = (await this.getParityNonce(address)) || '0'

    const nonce = BigNumber.maximum(web3Nonce, parityNonce)
    return nonce.toNumber() ? nonce.toString() : '0'
  }

  async getGasPrice(speed: AutoFeeLevels): Promise<string> {
    let gasPrice = await this.getGasStationGasPrice(speed)
    if (gasPrice) return gasPrice

    gasPrice = await this.getWeb3GasPrice()
    if (gasPrice) return gasPrice

    return DEFAULT_GAS_PRICE_IN_WEI
  }

  async estimateGas(txObject: TransactionConfig, txType: EthTxType): Promise<number> {
    try {
      // estimateGas mutates txObject so must pass in a clone
      let gas = await this._retryDced(() => this.eth.estimateGas({ ...txObject }))
      if (gas > 21000) {
        // No need for multiplier for regular ethereum transfers
        gas = gas * GAS_ESTIMATE_MULTIPLIER
      }

      const maxGas = MAXIMUM_GAS[txType]
      if (gas > maxGas) {
        gas = maxGas
      }

      const result = Math.ceil(gas)
      this.logger.debug(`Estimated gas limit of ${result} for ${txType}`)
      return result
    } catch (e) {
      this.logger.warn(`Failed to estimate gas for ${txType} -- ${e}`)
      return MAXIMUM_GAS[txType]
    }
  }

  private async getWeb3Nonce(address: string): Promise<string> {
    try {
      const nonce = await this._retryDced(() => this.eth.getTransactionCount(address, 'pending'))
      return new BigNumber(nonce).toString()
    } catch (e) {
      return ''
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

  private async getWeb3GasPrice(): Promise<string> {
    try {
      const wei = new BigNumber(await this._retryDced(() => this.eth.getGasPrice()))
      this.logger.log(`Retrieved gas price of ${wei.div(1e9)} Gwei from web3`)
      return wei.dp(0, BigNumber.ROUND_DOWN).toFixed()
    } catch (e) {
      this.logger.warn('Failed to retrieve gas price from web3 - ', e.toString())
      return ''
    }
  }

  async _retryDced<T>(fn: () => Promise<T>): Promise<T> {
    return retryIfDisconnected(fn, this.logger)
  }
}
