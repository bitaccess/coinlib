import {
  PaymentsUtils,
  Payport,
  createUnitConverters,
  AutoFeeLevels,
  FeeRate,
  FeeRateType,
  NetworkType,
  BalanceResult,
  TransactionStatus,
  BlockInfo,
} from '@bitaccess/coinlib-common'
import { Logger, DelegateLogger, assertType, isNull, Numeric, isUndefined, isNumber } from '@faast/ts-common'
import BigNumber from 'bignumber.js'
import Web3 from 'web3'
import { TransactionReceipt, Transaction, TransactionConfig } from 'web3-core'
import Contract from 'web3-eth-contract'

import InputDataDecoder from 'ethereum-input-data-decoder'

import { deriveAddress } from './erc20/deriveAddress'
import * as SIGNATURE from './erc20/constants'

import {
  PACKAGE_NAME,
  ETH_DECIMAL_PLACES,
  ETH_NAME,
  ETH_SYMBOL,
  DEFAULT_ADDRESS_FORMAT,
  MIN_SWEEPABLE_WEI,
  MIN_CONFIRMATIONS,
  TOKEN_METHODS_ABI,
  TOKEN_WALLET_ABI_LEGACY,
  TOKEN_WALLET_ABI,
  MAXIMUM_GAS,
  GAS_ESTIMATE_MULTIPLIER,
  NETWORK_DATA_PROVIDERS,
} from './constants'
import { EthereumTransactionInfo, EthereumWeb3Config, EthTxType, EthereumNetworkDataProvider } from './types'
import { retryIfDisconnected } from './utils'
import { UnitConvertersUtil } from './UnitConvertersUtil'

export class NetworkDataWeb3 extends UnitConvertersUtil implements EthereumNetworkDataProvider {
  web3: Web3
  eth: Web3['eth']
  logger: Logger
  server: string | null
  tokenAddress?: string

  constructor(config: EthereumWeb3Config) {
    super({ coinDecimals: config.decimals })

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
    this.tokenAddress = config.tokenAddress
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

  async getBlock(id?: string | number): Promise<BlockInfo> {
    const raw = await this._retryDced(() => this.eth.getBlock(id ?? 'latest', true))

    return {
      id: raw.hash,
      height: raw.number,
      previousId: raw.parentHash,
      time: new Date(isNumber(raw.timestamp) ? raw.timestamp * 1000 : raw.timestamp),
      raw: {
        ...raw,
        dataProvider: NETWORK_DATA_PROVIDERS.INFURA,
      },
    }
  }

  async getTransactionInfoERC20(txid: string, tokenAddress = this.tokenAddress): Promise<EthereumTransactionInfo> {
    const minConfirmations = MIN_CONFIRMATIONS
    const tx: Transaction | null = await this._retryDced(() => this.eth.getTransaction(txid))

    if (!tx) {
      throw new Error(`Transaction ${txid} not found`)
    }

    if (!tx.input) {
      throw new Error(`Transaction ${txid} has no input data so it can't be an ERC20 tx`)
    }

    const currentBlockNumber = await this.getCurrentBlockNumber()
    let txReceipt: TransactionReceipt | null = await this._retryDced(() => this.eth.getTransactionReceipt(txid))

    let txBlock: any = null
    let isConfirmed = false
    let confirmationTimestamp: Date | null = null
    let confirmations = 0
    if (tx.blockNumber) {
      confirmations = currentBlockNumber - tx.blockNumber
      if (confirmations > minConfirmations) {
        isConfirmed = true
        txBlock = await this._retryDced(() => this.eth.getBlock(tx.blockNumber!))
        confirmationTimestamp = new Date(Number(txBlock.timestamp) * 1000)
      }
    }

    let status: TransactionStatus = TransactionStatus.Pending
    let isExecuted = false
    if (isConfirmed) {
      status = TransactionStatus.Confirmed
      isExecuted = true
      // No trust to types description of web3
      if (txReceipt && (txReceipt?.status === false || txReceipt.status.toString() === 'false')) {
        status = TransactionStatus.Failed
        isExecuted = false
      }
    }

    let fromAddress = tx.from.toLowerCase()
    let toAddress = ''
    let amount = ''

    if (tx.input.startsWith(SIGNATURE.ERC20_TRANSFER)) {
      if ((tx.to || '').toLowerCase() !== tokenAddress!.toLowerCase()) {
        throw new Error(`Transaction ${txid} was sent to different contract: ${tx.to}, Expected: ${tokenAddress}`)
      }

      const tokenDecoder = new InputDataDecoder(TOKEN_METHODS_ABI)
      const txData = tokenDecoder.decodeData(tx.input)
      toAddress = this.web3.utils.toChecksumAddress(txData.inputs[0]).toLowerCase()
      amount = this.toMainDenomination(txData.inputs[1].toString())
      if (txReceipt) {
        const actualAmount = this.getErc20TransferLogAmount(txReceipt)
        if (isExecuted && amount !== actualAmount) {
          this.logger.warn(
            `Transcation ${txid} tried to transfer ${amount} but only ${actualAmount} was actually transferred`,
          )
        }
      }
    } else if (
      tx.input.startsWith(SIGNATURE.ERC20_SWEEP_CONTRACT_DEPLOY) ||
      tx.input.startsWith(SIGNATURE.ERC20_SWEEP_CONTRACT_DEPLOY_LEGACY)
    ) {
      amount = '0'
    } else if (tx.input.startsWith(SIGNATURE.ERC20_PROXY)) {
      amount = '0'
    } else if (tx.input.startsWith(SIGNATURE.ERC20_SWEEP)) {
      const tokenDecoder = new InputDataDecoder(TOKEN_WALLET_ABI)
      const txData = tokenDecoder.decodeData(tx.input)

      if (txData.inputs.length !== 4) {
        throw new Error(`Transaction ${txid} has not recognized number of inputs ${txData.inputs.length}`)
      }
      // For ERC20 sweeps:
      // tx.from is the contract address
      // inputs[0] is salt
      // inputs[1] is the ERC20 contract address (this.tokenAddress)
      // inputs[2] is the recipient of the funds (toAddress)
      // inputs[3] is the amount
      const sweepContractAddress = tx.to
      if (!sweepContractAddress) {
        throw new Error(`Transaction ${txid} should have a to address destination`)
      }

      const addr = deriveAddress(sweepContractAddress, `0x${txData.inputs[0].toString('hex')}`, true)

      fromAddress = this.web3.utils.toChecksumAddress(addr).toLowerCase()
      toAddress = this.web3.utils.toChecksumAddress(txData.inputs[2]).toLowerCase()
      if (txReceipt) {
        amount = this.getErc20TransferLogAmount(txReceipt)
      } else {
        amount = this.toMainDenomination(txData.inputs[3].toString())
      }
    } else if (tx.input.startsWith(SIGNATURE.ERC20_SWEEP_LEGACY)) {
      const tokenDecoder = new InputDataDecoder(TOKEN_WALLET_ABI_LEGACY)
      const txData = tokenDecoder.decodeData(tx.input)

      if (txData.inputs.length !== 2) {
        throw new Error(`Transaction ${txid} has not recognized number of inputs ${txData.inputs.length}`)
      }
      // For ERC20 legacy sweeps:
      // tx.to is the sweep contract address and source of funds (fromAddress)
      // tx.from is the contract owner address
      // inputs[0] is the ERC20 contract address (this.tokenAddress)
      // inputs[1] is the recipient of the funds (toAddress)
      const sweepContractAddress = tx.to
      if (!sweepContractAddress) {
        throw new Error(`Transaction ${txid} should have a to address destination`)
      }
      fromAddress = this.web3.utils.toChecksumAddress(sweepContractAddress).toLowerCase()
      toAddress = this.web3.utils.toChecksumAddress(txData.inputs[1]).toLowerCase()

      if (txReceipt) {
        amount = this.getErc20TransferLogAmount(txReceipt)
      }
    } else {
      throw new Error(`Transaction ${txid} is not ERC20 transaction neither swap`)
    }

    // NOTE: for the sake of consistent schema return
    if (!txReceipt) {
      txReceipt = {
        transactionHash: tx.hash,
        from: tx.from || '',
        to: toAddress,
        status: true,
        blockNumber: 0,
        cumulativeGasUsed: 0,
        gasUsed: 0,
        transactionIndex: 0,
        blockHash: '',
        logs: [],
        logsBloom: '',
      }

      return {
        id: txid,
        amount,
        toAddress,
        fromAddress: tx.from,
        toExtraId: null,
        fromIndex: null,
        toIndex: null,
        fee: this.toMainDenominationEth(new BigNumber(tx.gasPrice).multipliedBy(tx.gas)),
        sequenceNumber: tx.nonce,
        weight: tx.gas,
        isExecuted: false,
        isConfirmed: false,
        confirmations: 0,
        confirmationId: null,
        confirmationTimestamp: null,
        currentBlockNumber: currentBlockNumber,
        status: TransactionStatus.Pending,
        data: {
          ...tx,
          ...txReceipt,
          currentBlock: currentBlockNumber,
        },
      }
    }

    return {
      id: txid,
      amount,
      toAddress,
      fromAddress,
      toExtraId: null,
      fromIndex: null,
      toIndex: null,
      fee: this.toMainDenominationEth(new BigNumber(tx.gasPrice).multipliedBy(txReceipt.gasUsed)),
      sequenceNumber: tx.nonce,
      weight: txReceipt.gasUsed,
      // XXX if tx was confirmed but not accepted by network isExecuted must be false
      isExecuted,
      isConfirmed,
      confirmations,
      confirmationId: tx.blockHash,
      confirmationTimestamp,
      status,
      currentBlockNumber: currentBlockNumber,
      data: {
        ...tx,
        ...txReceipt,
        currentBlock: currentBlockNumber,
      },
    }
  }

  isAddressBalanceSweepable(balanceEth: Numeric): boolean {
    return this.toBaseDenominationBigNumberEth(balanceEth).gt(MIN_SWEEPABLE_WEI)
  }

  async getAddressBalance(address: string) {
    const balance = await this._retryDced(() => this.eth.getBalance(address))
    const confirmedBalance = this.toMainDenomination(balance).toString()
    const sweepable = this.isAddressBalanceSweepable(confirmedBalance)

    return {
      confirmedBalance,
      unconfirmedBalance: '0',
      spendableBalance: confirmedBalance,
      sweepable,
      requiresActivation: false,
    }
  }

  async getAddressBalanceERC20(address: string, tokenAddress: string): Promise<BalanceResult> {
    const contract = this.newContract(TOKEN_METHODS_ABI, tokenAddress)
    const balance = await contract.methods.balanceOf(address).call({})

    const sweepable = this.toMainDenominationBigNumber(balance).gt(0)

    return {
      confirmedBalance: this.toMainDenomination(balance),
      unconfirmedBalance: '0',
      spendableBalance: this.toMainDenomination(balance),
      sweepable,
      requiresActivation: false,
    }
  }

  private getErc20TransferLogAmount(txReceipt: TransactionReceipt): string {
    const transferLog = txReceipt.logs.find(log => log.topics[0] === SIGNATURE.LOG_TOPIC0_ERC20_SWEEP)
    if (!transferLog) {
      this.logger.warn(
        `Transaction ${txReceipt.transactionHash} was an ERC20 sweep but cannot find log for Transfer event`,
      )
      return '0'
    }
    return this.toMainDenomination(transferLog.data)
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
