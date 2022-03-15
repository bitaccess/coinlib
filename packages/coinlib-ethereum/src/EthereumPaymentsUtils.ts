import Web3 from 'web3'
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
import {
  Logger,
  DelegateLogger,
  assertType,
  isNull,
  Numeric,
  isUndefined,
  isNumber
} from '@faast/ts-common'
import BigNumber from 'bignumber.js'
import type { TransactionReceipt, Transaction } from 'web3-core'
import Contract from 'web3-eth-contract'
import InputDataDecoder from 'ethereum-input-data-decoder'

import { deriveAddress } from './erc20/deriveAddress'
import * as SIGNATURE from './erc20/constants'
import {
  PACKAGE_NAME, ETH_DECIMAL_PLACES, ETH_NAME, ETH_SYMBOL, DEFAULT_ADDRESS_FORMAT, MIN_SWEEPABLE_WEI, MIN_CONFIRMATIONS, TOKEN_METHODS_ABI, TOKEN_WALLET_ABI_LEGACY, TOKEN_WALLET_ABI,
} from './constants'
import { EthereumAddressFormat, EthereumAddressFormatT, EthereumPaymentsUtilsConfig, EthereumTransactionInfo } from './types'
import { isValidXkey } from './bip44'
import { NetworkData } from './NetworkData'
import { retryIfDisconnected } from './utils'

type UnitConverters = ReturnType<typeof createUnitConverters>

export class EthereumPaymentsUtils implements PaymentsUtils {
  readonly networkType: NetworkType
  readonly coinSymbol: string
  readonly coinName: string
  readonly coinDecimals: number
  readonly tokenAddress?: string

  logger: Logger
  server: string | null
  web3: Web3
  eth: Web3['eth']
  gasStation: NetworkData

  constructor(config: EthereumPaymentsUtilsConfig) {
    this.logger = new DelegateLogger(config.logger, PACKAGE_NAME)
    this.networkType = config.network || NetworkType.Mainnet
    this.coinName = config.name ?? ETH_NAME
    this.coinSymbol = config.symbol ?? ETH_SYMBOL
    this.coinDecimals = config.decimals ?? ETH_DECIMAL_PLACES
    this.tokenAddress = config.tokenAddress?.toLowerCase()
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
    if (provider && process.env.NODE_DEBUG && process.env.NODE_DEBUG.includes('ethereum-payments')) {
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
    this.gasStation = new NetworkData(this.eth, config.gasStation, config.parityNode, this.logger)

    const unitConverters = createUnitConverters(this.coinDecimals)
    this.toMainDenominationBigNumber = unitConverters.toMainDenominationBigNumber
    this.toBaseDenominationBigNumber = unitConverters.toBaseDenominationBigNumber
    this.toMainDenomination = unitConverters.toMainDenominationString
    this.toBaseDenomination = unitConverters.toBaseDenominationString

    const ethUnitConverters = createUnitConverters(ETH_DECIMAL_PLACES)
    this.toMainDenominationBigNumberEth = ethUnitConverters.toMainDenominationBigNumber
    this.toBaseDenominationBigNumberEth = ethUnitConverters.toBaseDenominationBigNumber
    this.toMainDenominationEth = ethUnitConverters.toMainDenominationString
    this.toBaseDenominationEth = ethUnitConverters.toBaseDenominationString
  }

  async init() {}
  async destroy() {}

  toMainDenominationBigNumber: UnitConverters['toMainDenominationBigNumber']
  toBaseDenominationBigNumber: UnitConverters['toMainDenominationBigNumber']
  toMainDenomination: UnitConverters['toMainDenominationString']
  toBaseDenomination: UnitConverters['toBaseDenominationString']

  toMainDenominationBigNumberEth: UnitConverters['toMainDenominationBigNumber']
  toBaseDenominationBigNumberEth: UnitConverters['toMainDenominationBigNumber']
  toMainDenominationEth: UnitConverters['toMainDenominationString']
  toBaseDenominationEth: UnitConverters['toBaseDenominationString']

  isValidAddress(address: string, options: { format?: string } = {}): boolean {
    const { format } = options
    if (format === EthereumAddressFormat.Lowercase) {
      return this.web3.utils.isAddress(address) &&
        address === address.toLowerCase()
    } else if (format === EthereumAddressFormat.Checksum) {
      return this.web3.utils.checkAddressChecksum(address)
    }
    return this.web3.utils.isAddress(address)
  }

  standardizeAddress(address: string, options?: { format?: string }): string | null {
    if (!this.web3.utils.isAddress(address)) {
      return null
    }
    const format = assertType(EthereumAddressFormatT, options?.format ?? DEFAULT_ADDRESS_FORMAT, 'format')
    if (format === EthereumAddressFormat.Lowercase) {
      return address.toLowerCase()
    } else {
      return this.web3.utils.toChecksumAddress(address)
    }
  }

  isValidExtraId(extraId: unknown): boolean {
    return false
  }

  // XXX Payport methods can be moved to payments-common
  isValidPayport(payport: Payport): payport is Payport {
    return Payport.is(payport) && !this._getPayportValidationMessage(payport)
  }

  validatePayport(payport: Payport): void {
    const message = this._getPayportValidationMessage(payport)
    if (message) {
      throw new Error(message)
    }
  }

  getPayportValidationMessage(payport: Payport): string | undefined {
    try {
      payport = assertType(Payport, payport, 'payport')
    } catch (e) {
      return e.message
    }
    return this._getPayportValidationMessage(payport)
  }

  isValidXprv(xprv: string): boolean {
    return isValidXkey(xprv) && xprv.substring(0, 4) === 'xprv'
  }

  isValidXpub(xpub: string): boolean {
    return isValidXkey(xpub) && xpub.substring(0, 4) === 'xpub'
  }

  isValidPrivateKey(prv: string): boolean {
    try {
      return Boolean(this.web3.eth.accounts.privateKeyToAccount(prv))
    } catch (e) {
      return false
    }
  }

  privateKeyToAddress(prv: string): string {
    let key: string
    if (prv.substring(0, 2) === '0x') {
      key = prv
    } else {
      key = `0x${prv}`
    }

    return this.web3.eth.accounts.privateKeyToAccount(key).address.toLowerCase()
  }

  private _getPayportValidationMessage(payport: Payport): string | undefined {
    try {
      const { address } = payport
      if (!(this.isValidAddress(address))) {
        return 'Invalid payport address'
      }
    } catch (e) {
      return 'Invalid payport address'
    }
    return undefined
  }

  async getFeeRateRecommendation(level: AutoFeeLevels): Promise<FeeRate> {
    const gasPrice = await this.gasStation.getGasPrice(level)
    return {
      feeRate: gasPrice,
      feeRateType: FeeRateType.BasePerWeight,
    }
  }

  async _retryDced<T>(fn: () => Promise<T>): Promise<T> {
    return retryIfDisconnected(fn, this.logger)
  }

  async getCurrentBlockNumber() {
    return this._retryDced(() => this.eth.getBlockNumber())
  }

  isAddressBalanceSweepable(balanceEth: Numeric): boolean {
    return this.toBaseDenominationBigNumberEth(balanceEth).gt(MIN_SWEEPABLE_WEI)
  }

  protected newContract(...args: ConstructorParameters<typeof Contract>) {
    const contract = new Contract(...args)
    contract.setProvider(this.eth.currentProvider)
    return contract
  }

  async getAddressBalanceERC20(address: string, tokenAddress: string): Promise<BalanceResult> {
    const contract = this.newContract(TOKEN_METHODS_ABI, this.tokenAddress)
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

  async getAddressBalance(address: string): Promise<BalanceResult> {
    if (this.tokenAddress) {
      return this.getAddressBalanceERC20(address, this.tokenAddress)
    }

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

  async getAddressNextSequenceNumber(address: string) {
    return this.gasStation.getNonce(address)
  }

  async getAddressUtxos() {
    return []
  }

  private getErc20TransferLogAmount(txReceipt: TransactionReceipt): string {
    const transferLog = txReceipt.logs.find((log) => log.topics[0] === SIGNATURE.LOG_TOPIC0_ERC20_SWEEP)
    if (!transferLog) {
      this.logger.warn(`Transaction ${txReceipt.transactionHash} was an ERC20 sweep but cannot find log for Transfer event`)
      return '0'
    }
    return this.toMainDenomination(transferLog.data)
  }

  async getTransactionInfoERC20(txid: string): Promise<EthereumTransactionInfo> {
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
      if((tx.to || '').toLowerCase() !== this.tokenAddress!.toLowerCase()) {
        throw new Error(`Transaction ${txid} was sent to different contract: ${tx.to}, Expected: ${this.tokenAddress}`)
      }

      const tokenDecoder = new InputDataDecoder(TOKEN_METHODS_ABI)
      const txData = tokenDecoder.decodeData(tx.input)
      toAddress = this.web3.utils.toChecksumAddress(txData.inputs[0]).toLowerCase()
      amount = this.toMainDenomination(txData.inputs[1].toString())
      if (txReceipt) {
        const actualAmount = this.getErc20TransferLogAmount(txReceipt)
        if (isExecuted && amount !== actualAmount) {
          this.logger.warn(
            `Transcation ${txid} tried to transfer ${amount} but only ${actualAmount} was actually transferred`
          )
        }
      }
    } else if (tx.input.startsWith(SIGNATURE.ERC20_SWEEP_CONTRACT_DEPLOY)
      || tx.input.startsWith(SIGNATURE.ERC20_SWEEP_CONTRACT_DEPLOY_LEGACY)) {
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

      const addr = deriveAddress(
        sweepContractAddress,
        `0x${txData.inputs[0].toString('hex')}`,
        true
      )

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
        logsBloom: ''
      }

      return {
        id: txid,
        amount,
        toAddress,
        fromAddress: tx.from,
        toExtraId: null,
        fromIndex: null,
        toIndex: null,
        fee: this.toMainDenominationEth((new BigNumber(tx.gasPrice)).multipliedBy(tx.gas)),
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
          currentBlock: currentBlockNumber
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
      fee: this.toMainDenominationEth((new BigNumber(tx.gasPrice)).multipliedBy(txReceipt.gasUsed)),
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
        currentBlock: currentBlockNumber
      },
    }
  }

  async getTransactionInfo(txid: string): Promise<EthereumTransactionInfo> {
    // If a tokenAddress has been defined, this is an ERC20 utils so use different decoding logic
    if (this.tokenAddress) {
      return this.getTransactionInfoERC20(txid)
    }

    // XXX it is suggested to keep 12 confirmations
    // https://ethereum.stackexchange.com/questions/319/what-number-of-confirmations-is-considered-secure-in-ethereum
    const minConfirmations = MIN_CONFIRMATIONS
    const tx: Transaction | null = await this._retryDced(() => this.eth.getTransaction(txid))

    if (!tx) {
      throw new Error(`Transaction ${txid} not found`)
    }

    const currentBlockNumber = await this.getCurrentBlockNumber()
    let txInfo: TransactionReceipt | null = await this._retryDced(() => this.eth.getTransactionReceipt(txid))

    tx.from = tx.from ? tx.from.toLowerCase() : '';
    tx.to = tx.to ? tx.to.toLowerCase() : '';

    // NOTE: for the sake of consistent schema return
    if (!txInfo) {
      txInfo = {
        transactionHash: tx.hash,
        from: tx.from,
        to: tx.to,
        status: true,
        blockNumber: 0,
        cumulativeGasUsed: 0,
        gasUsed: 0,
        transactionIndex: 0,
        blockHash: '',
        logs: [],
        logsBloom: ''
      }

      return {
        id: txid,
        amount: this.toMainDenomination(tx.value),
        toAddress: tx.to ? tx.to.toLowerCase() : null,
        fromAddress: tx.from ? tx.from.toLowerCase() : null,
        toExtraId: null,
        fromIndex: null,
        toIndex: null,
        fee: this.toMainDenomination((new BigNumber(tx.gasPrice)).multipliedBy(tx.gas)),
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
          ...txInfo,
          currentBlock: currentBlockNumber
        },
      }
    }

    let isConfirmed = false
    let confirmationTimestamp: Date | null = null
    let confirmations = 0
    if (tx.blockNumber) {
      confirmations = currentBlockNumber - tx.blockNumber
      if (confirmations > minConfirmations) {
        isConfirmed = true
        const txBlock = await this._retryDced(() => this.eth.getBlock(tx.blockNumber!))
        confirmationTimestamp = new Date(Number(txBlock.timestamp) * 1000)
      }
    }

    let status: TransactionStatus = TransactionStatus.Pending
    if (isConfirmed) {
      status = TransactionStatus.Confirmed
      // No trust to types description of web3
      if (txInfo && (txInfo?.status === false || txInfo.status.toString() === 'false')) {
        status = TransactionStatus.Failed
      }
    }

    txInfo.from = tx.from
    txInfo.to = tx.to

    return {
      id: txid,
      amount: this.toMainDenomination(tx.value),
      toAddress: tx.to ? tx.to.toLowerCase() : null,
      fromAddress: tx.from ? tx.from.toLowerCase() : null,
      toExtraId: null,
      fromIndex: null,
      toIndex: null,
      fee: this.toMainDenomination((new BigNumber(tx.gasPrice)).multipliedBy(txInfo.gasUsed)),
      sequenceNumber: tx.nonce,
      weight: txInfo.gasUsed,
      // XXX if tx was confirmed but not accepted by network isExecuted must be false
      isExecuted: status !== TransactionStatus.Failed,
      isConfirmed,
      confirmations,
      confirmationId: tx.blockHash,
      confirmationTimestamp,
      status,
      currentBlockNumber: currentBlockNumber,
      data: {
        ...tx,
        ...txInfo,
        currentBlock: currentBlockNumber
      },
    }
  }

  async getBlock(id?: string | number): Promise<BlockInfo> {
    const raw = await this.eth.getBlock(id ?? 'latest')
    return {
      id: raw.hash,
      height: raw.number,
      previousId: raw.parentHash,
      time: new Date(isNumber(raw.timestamp) ? raw.timestamp * 1000 : raw.timestamp),
      raw: raw
    }
  }
}
