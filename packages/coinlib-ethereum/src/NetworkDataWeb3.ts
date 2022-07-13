import { BlockInfo, BigNumber } from '@bitaccess/coinlib-common'
import { Logger, DelegateLogger, isNull, isNumber } from '@faast/ts-common'
import Web3 from 'web3'
import { TransactionConfig } from 'web3-core'
import Contract from 'web3-eth-contract'
import { BlockTransactionObject, Transaction, TransactionReceipt } from 'web3-eth'

import {
  TOKEN_METHODS_ABI,
  FULL_ERC20_TOKEN_METHODS_ABI,
  MAXIMUM_GAS,
  GAS_ESTIMATE_MULTIPLIER,
  NETWORK_DATA_PROVIDERS,
  PACKAGE_NAME,
} from './constants'
import {
  EthereumWeb3Config,
  EthTxType,
  EthereumNetworkDataProvider,
  EthereumStandardizedTransaction,
  EthereumStandardizedERC20Transaction,
} from './types'
import { retryIfDisconnected } from './utils'
import { get } from 'lodash'

export class NetworkDataWeb3 implements EthereumNetworkDataProvider {
  web3: Web3
  eth: Web3['eth']
  logger: Logger
  server: string | null

  constructor(config: EthereumWeb3Config) {
    this.logger = new DelegateLogger(config.logger, this.constructor.name)
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

    // Debug mode to print out all outgoing req/res
    if (provider && process.env.NODE_DEBUG && process.env.NODE_DEBUG.includes(PACKAGE_NAME)) {
      const send = provider.send
      provider.send = (payload: any, cb: Function) => {
        this.logger.debug(`web3 provider request ${this.server}`, payload)
        send.call(provider, payload, (error: Error, result: any) => {
          if (error) {
            this.logger.debug(`web3 provider response error ${this.server}`, error)
          } else {
            this.logger.debug(`web3 provider response result ${this.server}`, result)
          }
          cb(error, result)
        })
      }
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
    const block = await this._retryDced(() => this.eth.getBlock(id ?? 'latest', true))

    return this.standardizeBlock(block)
  }

  async getERC20Transaction(txId: string, tokenAddress: string) {
    const tx = await this._retryDced(() => this.eth.getTransaction(txId))

    const txReceipt = await this.getTransactionReceipt(txId)

    const block = await this.getBlock(tx.blockHash!)
    const currentBlockNumber = await this.getCurrentBlockNumber()
    const tokenDetails = await this.getTokenInfo(tokenAddress)

    return this.standardizeERC20Transaction(
      { tx, txReceipt },
      {
        blockTime: block.time,
        currentBlockNumber,
        ...tokenDetails,
      },
    )
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
    const tx = await this._retryDced(() => this.eth.getTransaction(txId))

    const txReceipt = await this.getTransactionReceipt(txId)
    const currentBlockNumber = await this.getCurrentBlockNumber()
    const block = await this.getBlock(tx.blockHash!)

    return this.standardizeTransaction(tx, {
      blockTime: block.time,
      currentBlockNumber,
      gasUsed: txReceipt.gasUsed,
      contractAddress: txReceipt.contractAddress,
      status: txReceipt.status,
    })
  }

  async standardizeBlock(block: BlockTransactionObject) {
    const blockTime = block.timestamp
      ? new Date(isNumber(block.timestamp) ? block.timestamp * 1000 : block.timestamp)
      : null
    const currentBlockNumber = await this.getCurrentBlockNumber()

    const standardizedTransactionsPromise = block.transactions.map(async tx => {
      const txHash = get(tx, 'hash', tx) as string

      const txReceipt = await this.getTransactionReceipt(txHash)

      return this.standardizeTransaction(tx, {
        blockTime,
        gasUsed: txReceipt.gasUsed,
        currentBlockNumber,
        status: txReceipt.status,
      })
    })

    const standardizedTransactions = await Promise.all(standardizedTransactionsPromise)

    const blockInfo: BlockInfo = {
      id: block.hash,
      height: block.number,
      previousId: block.parentHash,
      time: blockTime!,
      raw: {
        ...block,
        transactions: standardizedTransactions,
        dataProvider: NETWORK_DATA_PROVIDERS.INFURA,
      },
    }

    return blockInfo
  }

  standardizeTransaction(
    tx: Transaction,
    {
      blockTime,
      currentBlockNumber,
      gasUsed,
      contractAddress,
      status,
    }: {
      blockTime: Date | null
      currentBlockNumber: number
      gasUsed: number
      contractAddress?: string
      status: boolean
    },
  ): EthereumStandardizedTransaction {
    const standardizedTransaction: EthereumStandardizedTransaction = {
      from: tx.from,
      to: tx.to!,
      blockHash: tx.blockHash!,
      blockHeight: tx.blockNumber!,
      blockTime,
      nonce: tx.nonce,
      txHash: tx.hash,
      value: tx.value,
      gasUsed,
      gasPrice: tx.gasPrice,
      confirmations: tx.blockNumber ? currentBlockNumber - tx.blockNumber : 0,
      contractAddress,
      status,
      raw: {
        ...tx,
        blockTime,
        currentBlockNumber,
        gasUsed,
        dataProvider: NETWORK_DATA_PROVIDERS.INFURA,
      },
    }

    return standardizedTransaction
  }

  standardizeERC20Transaction(
    {
      tx,
      txReceipt,
    }: {
      tx: Transaction
      txReceipt: TransactionReceipt
    },
    {
      blockTime,
      currentBlockNumber,
      tokenDecimals,
      tokenName,
      tokenSymbol,
    }: { blockTime: Date; currentBlockNumber: number; tokenDecimals: string; tokenName: string; tokenSymbol: string },
  ): EthereumStandardizedERC20Transaction {
    const standardizedTx = this.standardizeTransaction(tx, {
      gasUsed: txReceipt.gasUsed,
      currentBlockNumber,
      blockTime,
      contractAddress: txReceipt.contractAddress,
      status: txReceipt.status,
    })

    const result: EthereumStandardizedERC20Transaction = {
      ...standardizedTx,
      txInput: tx.input,
      tokenSymbol,
      tokenDecimals,
      tokenName,
      receipt: {
        gasUsed: txReceipt.gasUsed.toString(),
        logs: txReceipt.logs,
        status: txReceipt.status,
      },
    }

    return result
  }

  async _retryDced<T>(fn: () => Promise<T>): Promise<T> {
    return retryIfDisconnected(fn, this.logger)
  }
}
