import * as request from 'request-promise-native'
import { BigNumber } from 'bignumber.js'
import Web3 from 'web3'
import { provider } from 'web3-core'
import { Eth } from 'web3-eth'

import {
  DEFAULT_GAS_PRICE_IN_WEI,
  GAS_STATION_URL,
  SPEED,
  PRICES,
  GAS_ESTIMATE_MULTIPLIER,
  ETHEREUM_TRANSFER_COST,
} from './constants'

export class NetworkData {
  private gasStationUrl: string | undefined
  private parityUrl: string | undefined
  private infuraUrl: string | undefined
  private eth: Eth

  constructor(gasStationUrl: string = GAS_STATION_URL, parityUrl?: string, infuraUrl?: string) {
    this.gasStationUrl = gasStationUrl
    this.parityUrl = parityUrl
    this.infuraUrl = infuraUrl

    this.eth = (new Web3(infuraUrl as provider)).eth
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

  async estimateGas(from: string, to: string, action: string): Promise<string> {
    let gas: BigNumber = new BigNumber(PRICES[action])

    try {
      gas = new BigNumber(await this.eth.estimateGas({ from, to })).times(GAS_ESTIMATE_MULTIPLIER)
    } catch (e) {
    }

    if (action === 'ETHEREUM_TRANSFER' && gas.isGreaterThan(ETHEREUM_TRANSFER_COST)) {
      gas = new BigNumber(ETHEREUM_TRANSFER_COST)
    }

    return gas.toNumber() ? gas.toString() : ETHEREUM_TRANSFER_COST
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
    const options = {
      url: `${this.gasStationUrl}/json/ethgasAPI.json`,
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
