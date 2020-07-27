import * as request from 'request-promise-native'
import { BigNumber } from 'bignumber.js'
import Web3 from 'web3'
import { Logger, DelegateLogger } from '@faast/ts-common'

type Eth = Web3['eth']

import {
  DEFAULT_GAS_PRICE_IN_WEI,
  GAS_STATION_URL,
  SPEED,
  MAXIMUM_GAS,
  GAS_ESTIMATE_MULTIPLIER,
  ETHEREUM_TRANSFER_COST,
} from './constants'

export class NetworkData {
  private gasStationUrl: string | undefined
  private parityUrl: string | undefined
  private eth: Eth
  private logger: Logger

  constructor(eth: Eth, gasStationUrl: string = GAS_STATION_URL, parityUrl?: string, logger?: Logger | null) {
    this.eth = eth
    this.gasStationUrl = gasStationUrl
    this.parityUrl = parityUrl
    this.logger = new DelegateLogger(logger, 'NetworkData')
  }

  async getNetworkData(action: string, from: string, to: string, speed: string): Promise<{
    pricePerGasUnit: string,
    nonce: string,
    amountOfGas: string,
  }> {
    const pricePerGasUnit = await this.getGasPrice(speed)
    const nonce = await this.getNonce(from)
    const amountOfGas = await this.estimateGas(from, to, action)

    return {
      pricePerGasUnit,
      amountOfGas,
      nonce,
    }
  }

  async getNonce(address: string): Promise<string> {
    const web3Nonce = await this.getWeb3Nonce(address) || '0'
    const parityNonce = await this.getParityNonce(address) || '0'

    const nonce = BigNumber.maximum(web3Nonce, parityNonce)
    return nonce.toNumber() ? nonce.toString() : '0'
  }

  async getGasPrice(speed: string): Promise<string> {
    let gasPrice = await this.getGasStationGasPrice(speed)
    if (gasPrice) return gasPrice

    gasPrice = await this.getWeb3GasPrice()
    if (gasPrice) return gasPrice

    return DEFAULT_GAS_PRICE_IN_WEI
  }

  async estimateGas(from: string, to: string, action: keyof typeof MAXIMUM_GAS): Promise<string> {
    try {
      let gas = new BigNumber(await this.eth.estimateGas({ from, to }))
      if (gas.gt(21000)) {
        // No need for multiplier for regular ethereum transfers
        gas = gas.times(GAS_ESTIMATE_MULTIPLIER)
      }

      const maxGas = MAXIMUM_GAS[action]
      if (gas.gt(maxGas)) {
        gas = new BigNumber(maxGas)
      }

      const result = gas.toFixed(0, BigNumber.ROUND_UP)
      this.logger.debug(`Estimated gas limit of ${result} for ${action} from ${from} to ${to}`)
      return result
    } catch (e) {
      this.logger.warn(`Failed to estimate gas for ${action} from ${from} to ${to}`, e)
      return MAXIMUM_GAS[action]
    }
  }

  private async getWeb3Nonce(address: string): Promise<string> {
    try {
      const nonce = await this.eth.getTransactionCount(address, 'pending')
      return (new BigNumber(nonce)).toString()
    } catch (e) {
      return ''
    }
  }

  private async getParityNonce(address: string): Promise<string> {
    const data = {
      method: 'parity_nextNonce',
      params: [address],
      id: 1,
      jsonrpc: '2.0'
    }
    const options = {
      url: this.parityUrl || '',
      json: data
    }

    let body: { [key: string]: string }
    try {
      body = await request.post(options)
    } catch (e) {
      return ''
    }
    if (!body || !body.result) {
      return ''
    }

    return (new BigNumber(body.result, 16)).toString()
  }

  private async getGasStationGasPrice(speed: string): Promise<string> {
    const hasKey = /\?api-key=/.test(this.gasStationUrl || '')
    const options = {
      url: hasKey ? `${this.gasStationUrl}` : `${this.gasStationUrl}/json/ethgasAPI.json`,
      json: true,
      timeout: 5000
    }
    let body: { [key: string]: number }
    try {
      body = await request.get(options)
    } catch (e) {
      return ''
    }
    if (!(body && body.blockNum && body[SPEED[speed]])) {
      return ''
    }

    const price10xGwei = body[SPEED[speed]]

    return (new BigNumber(price10xGwei)).dividedBy(10).multipliedBy(1e9).toString(10)
  }

  private async getWeb3GasPrice(): Promise<string> {
    try {
      return await this.eth.getGasPrice()
    } catch (e) {
      return ''
    }
  }
}
