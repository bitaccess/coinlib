import { BlockInfo, BigNumber } from '@bitaccess/coinlib-common'
import { Logger, DelegateLogger, isNull, isNumber } from '@bitaccess/ts-common'
import Web3 from 'web3'
import { TransactionConfig } from 'web3-core'
import Contract from 'web3-eth-contract'
import { Block, Transaction, TransactionReceipt } from 'web3-eth'
import * as t from 'io-ts'

import {
  TOKEN_METHODS_ABI,
  FULL_ERC20_TOKEN_METHODS_ABI,
  MAXIMUM_GAS,
  GAS_ESTIMATE_MULTIPLIER,
  PACKAGE_NAME,
} from './constants'
import {
  EthereumWeb3Config,
  EthTxType,
  EthereumNetworkDataProvider,
  EthereumStandardizedTransaction,
  EthereumStandardizedERC20Transaction,
  NetworkDataProviders,
  ERC20TokenTransfer,
} from './types'
import { deriveCreate1Address, retryIfDisconnected } from './utils'
import { LOG_TOPIC_ERC20_TRANSFER } from './erc20/constants'

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
        // this.logger.debug(`web3 provider request ${this.server}`, payload)
        send.call(provider, payload, (error: Error, result: any) => {
          if (error) {
            // this.logger.debug(`web3 provider response error ${this.server}`, error)
          } else {
            // this.logger.debug(`web3 provider response result ${this.server}`, result)
          }
          cb(error, result)
        })
      }
    }

    this.eth = this.web3.eth

    // Set timeouts to -1 so sendRawTransaction doesn't poll or wait for confirmation
    this.eth.transactionPollingTimeout = -1
    this.eth.transactionBlockTimeout = -1
    // Set this to 1 so that transactions are considered "confirmed" after 1, not 24 blocks
    this.eth.transactionConfirmationBlocks = -1
  }

  protected newContract(...args: ConstructorParameters<typeof Contract>) {
    const contract = new Contract(...args)
    contract.setProvider(this.eth.currentProvider)
    contract.transactionPollingTimeout = -1
    contract.transactionBlockTimeout = -1
    contract.transactionConfirmationBlocks = -1
    return contract
  }

  async getCurrentBlockNumber() {
    return this._retryDced(() => this.eth.getBlockNumber())
  }

  async getTransactionReceipt(txId: string): Promise<TransactionReceipt | null> {
    return this._retryDced(() => this.eth.getTransactionReceipt(txId))
  }

  async getTokenInfo(tokenAddress: string): Promise<{ tokenSymbol: string; tokenDecimals: string; tokenName: string }> {
    const tokenContract = this.newContract(FULL_ERC20_TOKEN_METHODS_ABI, tokenAddress)

    const [tokenSymbol, tokenDecimals, tokenName] = await Promise.all([
      tokenContract.methods.symbol().call(),
      tokenContract.methods.decimals().call(),
      tokenContract.methods.name().call(),
    ])

    return { tokenSymbol, tokenDecimals, tokenName }
  }

  async getBlock(id?: string | number, includeTransactionObjects: boolean = false): Promise<BlockInfo> {
    const idParam = id ?? 'latest'
    let block: Block
    if (includeTransactionObjects) {
      block = await this._retryDced(() => this.eth.getBlock(idParam, true))
    } else {
      block = await this._retryDced(() => this.eth.getBlock(idParam, false))
    }

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
      if (!isNumber(gas) || isNaN(gas)) {
        // this.logger.warn(`Received invalid non-numeric gas estimate from web3: ${gas}`)
        return MAXIMUM_GAS[txType]
      }

      if (gas > 21000) {
        // No need for multiplier for regular ethereum transfers
        gas = gas * GAS_ESTIMATE_MULTIPLIER
      }

      const maxGas = MAXIMUM_GAS[txType]
      if (gas > maxGas) {
        gas = maxGas
      }

      const result = Math.ceil(gas)
      // this.logger.debug(`Estimated gas limit of ${result} for ${txType}`)
      return result
    } catch (e) {
      // this.logger.warn(`Failed to estimate gas for ${txType} -- ${e}`)
      return MAXIMUM_GAS[txType]
    }
  }

  async getNextNonce(address: string): Promise<number> {
    return this._retryDced(() => this.eth.getTransactionCount(address, 'pending'))
  }

  async getGasPrice(): Promise<string> {
    try {
      const wei = new BigNumber(await this._retryDced(() => this.eth.getGasPrice()))
      if (wei.isNaN()) {
        // this.logger.warn('Retrieved invalid NaN gas price from web3')
        return ''
      }
      // this.logger.log(`Retrieved gas price of ${wei.div(1e9)} Gwei from web3`)
      return wei.dp(0, BigNumber.ROUND_DOWN).toFixed()
    } catch (e) {
      // this.logger.warn('Failed to retrieve gas price from web3 - ', e.toString())
      return ''
    }
  }

  async getTransaction(txId: string) {
    const tx = await this._retryDced(() => this.eth.getTransaction(txId))

    const txReceipt = await this.getTransactionReceipt(txId)
    const currentBlockNumber = await this.getCurrentBlockNumber()
    const block = await this.getBlock(tx.blockHash!)

    return this.standardizeTransaction(tx, txReceipt, {
      blockTime: block.time,
      currentBlockNumber,
    })
  }

  async standardizeBlock(block: Block) {
    const blockTime = block.timestamp
      ? new Date(isNumber(block.timestamp) ? block.timestamp * 1000 : block.timestamp)
      : null

    let transactionHashes: string[] = []
    let standardizedTransactions: EthereumStandardizedTransaction[] = []
    if (t.array(t.string).is(block.transactions)) {
      transactionHashes = block.transactions
    } else {
      const currentBlockNumber = await this.getCurrentBlockNumber()
      const standardizedTransactionsPromise = block.transactions.map(async tx => {
        const txHash = tx.hash
        transactionHashes.push(txHash)

        // TODO: Use this.eth.BatchRequest here
        const txReceipt = await this.getTransactionReceipt(txHash)

        return this.standardizeTransaction(tx, txReceipt, {
          blockTime,
          currentBlockNumber,
        })
      })

      standardizedTransactions = await Promise.all(standardizedTransactionsPromise)
    }

    const blockInfo: BlockInfo = {
      id: block.hash,
      height: block.number,
      previousId: block.parentHash,
      time: blockTime!,
      raw: {
        ...block,
        transactions: standardizedTransactions,
        transactionHashes,
        dataProvider: NetworkDataProviders.Web3,
      },
    }

    return blockInfo
  }

  async getTokenTransfers(txReceipt: TransactionReceipt | null): Promise<ERC20TokenTransfer[]> {
    if (!txReceipt || txReceipt.logs.length < 1) {
      return []
    }

    const erc20TokenTransfers = txReceipt.logs.filter(log => log.topics[0] === LOG_TOPIC_ERC20_TRANSFER)
    const result: ERC20TokenTransfer[] = []

    for (const tokenTransfer of erc20TokenTransfers) {
      const tokenInfo = await this.getTokenInfo(tokenTransfer.address)

      const [, from, to] = tokenTransfer.topics

      const fromAddress = this.web3.eth.abi.decodeParameter('address', from) as unknown
      const toAddress = this.web3.eth.abi.decodeParameter('address', to) as unknown

      result.push({
        decimals: new BigNumber(tokenInfo.tokenDecimals).toNumber(),
        symbol: tokenInfo.tokenSymbol,
        name: tokenInfo.tokenName,
        token: tokenTransfer.address,
        type: 'ERC20',
        value: new BigNumber(tokenTransfer.data).toString(),
        from: fromAddress as string,
        to: toAddress as string,
      })
    }

    return result
  }

  async standardizeTransaction(
    tx: Transaction,
    txReceipt: TransactionReceipt | null,
    {
      blockTime,
      currentBlockNumber,
    }: {
      blockTime: Date | null
      currentBlockNumber: number
    },
  ): Promise<EthereumStandardizedTransaction> {
    const gasUsed = txReceipt?.gasUsed ?? 0
    const status = txReceipt?.status ?? false
    let contractAddress = txReceipt?.contractAddress ?? undefined

    if (!tx.from) {
      // this.logger.warn(`Missing tx.from in tx ${tx.hash}`, tx, txReceipt)
      // throw new Error(`Missing tx.from in tx ${tx.hash}`)
    }

    let to = tx.to ?? contractAddress
    if (!to) {
      to = deriveCreate1Address(tx.from, tx.nonce)
      contractAddress = to
    }
    const standardizedTransaction: EthereumStandardizedTransaction = {
      from: tx.from,
      to,
      blockHash: tx.blockHash!,
      blockHeight: tx.blockNumber!,
      blockTime,
      nonce: tx.nonce,
      txHash: tx.hash,
      value: tx.value,
      gasUsed,
      gasPrice: tx.gasPrice,
      confirmations: tx.blockNumber ? Math.max(currentBlockNumber - tx.blockNumber + 1, 0) : 0,
      contractAddress,
      status,
      currentBlockNumber,
      dataProvider: NetworkDataProviders.Web3,
      receipt: {
        ...(txReceipt ?? {}),
        gasUsed: String(gasUsed),
        status,
        logs: txReceipt?.logs ?? [],
      },
      raw: tx,
      tokenTransfers: await this.getTokenTransfers(txReceipt),
    }

    return standardizedTransaction
  }

  async standardizeERC20Transaction(
    {
      tx,
      txReceipt,
    }: {
      tx: Transaction
      txReceipt: TransactionReceipt | null
    },
    {
      blockTime,
      currentBlockNumber,
      tokenDecimals,
      tokenName,
      tokenSymbol,
    }: { blockTime: Date; currentBlockNumber: number; tokenDecimals: string; tokenName: string; tokenSymbol: string },
  ): Promise<EthereumStandardizedERC20Transaction> {
    const standardizedTx = await this.standardizeTransaction(tx, txReceipt, {
      currentBlockNumber,
      blockTime,
    })

    const result: EthereumStandardizedERC20Transaction = {
      ...standardizedTx,
      txInput: tx.input,
      tokenSymbol,
      tokenDecimals,
      tokenName,
      receipt: standardizedTx.receipt!,
    }

    return result
  }

  async _retryDced<T>(fn: () => Promise<T>): Promise<T> {
    return retryIfDisconnected(fn, this.logger)
  }
}
