import { BlockInfo } from '@bitaccess/coinlib-common'
import { Logger, DelegateLogger, isNull, isNumber } from '@faast/ts-common'
import BigNumber from 'bignumber.js'
import Web3 from 'web3'
import { TransactionConfig } from 'web3-core'
import Contract from 'web3-eth-contract'

import { TOKEN_METHODS_ABI, FULL_ERC20_TOKEN_METHODS_ABI, MAXIMUM_GAS, GAS_ESTIMATE_MULTIPLIER } from './constants'
import { EthereumWeb3Config, EthTxType, EthereumNetworkDataProvider } from './types'
import { retryIfDisconnected } from './utils'

export class NetworkDataWeb3 implements EthereumNetworkDataProvider {
  web3: Web3
  eth: Web3['eth']
  logger: Logger
  server: string | null

  constructor(config: EthereumWeb3Config) {
    this.logger = new DelegateLogger(config.logger, 'EthereumWeb3')
    this.server = config.fullNode || null

    let provider: any
    if (config.web3) {
      this.web3 = config.web3
    } else if (isNull(this.server)) {
      this.web3 = new Web3()
    } else if (this.server.startsWith('http')) {
      provider = new Web3.providers.HttpProvider(this.server, config.providerOptions)
      this.web3 = new Web3(provider)
    } else if (this.server.startsWith('ws')) {
      provider = new Web3.providers.WebsocketProvider(this.server, config.providerOptions)
      this.web3 = new Web3(provider)
    } else {
      throw new Error(`Invalid ethereum payments fullNode, must start with http or ws: ${this.server}`)
    }

    this.eth = this.web3.eth
  }

  protected newContract(...args: ConstructorParameters<typeof Contract>) {
    const contract = new Contract(...args)
    contract.setProvider(this.eth.currentProvider)
    return contract
  }

  async getCurrentBlockNumber() {
    return this._retryDced(() => this.eth.getBlockNumber())
  }

  async getTransactionReceipt(txId: string) {
    return this._retryDced(() => this.eth.getTransactionReceipt(txId))
  }

  async getTokenInfo(tokenAddress: string) {
    const tokenContract = this.newContract(FULL_ERC20_TOKEN_METHODS_ABI, tokenAddress)

    const [tokenSymbol, tokenDecimals, tokenName] = await Promise.all([
      tokenContract.methods.symbol().call(),
      tokenContract.methods.decimals().call(),
      tokenContract.methods.name().call(),
    ])

    return { tokenSymbol, tokenDecimals, tokenName }
  }

  async getBlock(id?: string | number): Promise<BlockInfo> {
    const raw = await this._retryDced(() => this.eth.getBlock(id ?? 'latest', true))

    return {
      id: raw.hash,
      height: raw.number,
      previousId: raw.parentHash,
      time: new Date(isNumber(raw.timestamp) ? raw.timestamp * 1000 : raw.timestamp),
      raw,
    }
  }

  async getERC20Transaction(txId: string, tokenAddress: string) {
    const tx = await this.getTransaction(txId)
    const txReceipt = await this.getTransactionReceipt(txId)

    return { tx, txReceipt }
  }

  async getAddressBalance(address: string) {
    return this._retryDced(() => this.eth.getBalance(address))
  }

  async getAddressBalanceERC20(address: string, tokenAddress: string) {
    const contract = this.newContract(TOKEN_METHODS_ABI, tokenAddress)
    const balance: string = await contract.methods.balanceOf(address).call({})

    return balance
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

  async getWeb3Nonce(address: string): Promise<string> {
    try {
      const nonce = await this._retryDced(() => this.eth.getTransactionCount(address, 'pending'))
      return new BigNumber(nonce).toString()
    } catch (e) {
      return ''
    }
  }

  async getWeb3GasPrice(): Promise<string> {
    try {
      const wei = new BigNumber(await this._retryDced(() => this.eth.getGasPrice()))
      this.logger.log(`Retrieved gas price of ${wei.div(1e9)} Gwei from web3`)
      return wei.dp(0, BigNumber.ROUND_DOWN).toFixed()
    } catch (e) {
      this.logger.warn('Failed to retrieve gas price from web3 - ', e.toString())
      return ''
    }
  }

  async getTransaction(txId: string) {
    return this._retryDced(() => this.eth.getTransaction(txId))
  }

  async _retryDced<T>(fn: () => Promise<T>): Promise<T> {
    return retryIfDisconnected(fn, this.logger)
  }
}
