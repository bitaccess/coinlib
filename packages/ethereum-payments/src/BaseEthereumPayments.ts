import { BigNumber } from 'bignumber.js'
import { Transaction as Tx } from 'ethereumjs-tx'
import Web3 from 'web3'
import type { TransactionReceipt, TransactionConfig } from 'web3-core'
import { cloneDeep } from 'lodash'
import {
  BalanceResult,
  BasePayments,
  TransactionStatus,
  FeeLevel,
  FeeOption,
  FeeRateType,
  FeeOptionCustom,
  Payport,
  FromTo,
  ResolveablePayport,
  PaymentsError,
  PaymentsErrorCode,
  CreateTransactionOptions as TransactionOptions,
  NetworkType,
  PayportOutput,
  AutoFeeLevels,
} from '@faast/payments-common'
import { isType, isString, isUndefined, isNull } from '@faast/ts-common'

import {
  EthereumTransactionInfo,
  EthereumUnsignedTransaction,
  EthereumSignedTransaction,
  EthereumBroadcastResult,
  BaseEthereumPaymentsConfig,
  EthereumResolvedFeeOption,
  EthereumTransactionOptions,
} from './types'
import { NetworkData } from './NetworkData'
import {
// TODO use them
//  DEFAULT_FULL_NODE,
//  DEFAULT_SOLIDITY_NODE,
  DEFAULT_FEE_LEVEL,
  MIN_CONFIRMATIONS,
  ETHEREUM_TRANSFER_COST,
  TOKEN_WALLET_DATA,
  DEPOSIT_KEY_INDEX,
} from './constants'
import { EthereumPaymentsUtils } from './EthereumPaymentsUtils'

export abstract class BaseEthereumPayments
  <Config extends BaseEthereumPaymentsConfig>
  extends EthereumPaymentsUtils
implements BasePayments
  <Config, EthereumUnsignedTransaction, EthereumSignedTransaction, EthereumBroadcastResult, EthereumTransactionInfo> {
  server: string | null
  web3: Web3
  eth: Web3['eth']
  gasStation: NetworkData
  private config: Config
  private toChecksumAddress: Function
  public depositKeyIndex: number

  constructor(config: Config) {
    super(config)

    this.config = config
    this.server = config.fullNode || null
    if (config.web3) {
      this.web3 = config.web3
    } else if (isNull(this.server)) {
      this.web3 = new Web3()
    } else if (this.server.startsWith('http')) {
      this.web3 = new Web3(new Web3.providers.HttpProvider(this.server, config.providerOptions))
    } else if (this.server.startsWith('ws')) {
      this.web3 = new Web3(new Web3.providers.WebsocketProvider(this.server, config.providerOptions))
    } else {
      throw new Error(`Invalid ethereum payments fullNode, must start with http or ws: ${this.server}`)
    }
    this.eth = this.web3.eth
    this.gasStation = new NetworkData(this.eth, config.gasStation, config.parityNode, this.logger)
    this.depositKeyIndex = (typeof config.depositKeyIndex === 'undefined') ? DEPOSIT_KEY_INDEX : config.depositKeyIndex
    this.toChecksumAddress = this.web3.utils.toChecksumAddress
  }

  async init() {}
  async destroy() {}

  getFullConfig(): Config {
    return this.config
  }

  abstract getPublicConfig(): Config

  async resolvePayport(payport: ResolveablePayport): Promise<Payport> {
    // NOTE: this type of nesting suggests to revise payport as an abstraction
    if (typeof payport === 'number') {
      return this.getPayport(payport)
    } else if (typeof payport === 'string') {
      if (!await this.isValidAddress(payport)) {
        throw new Error(`Invalid Ethereum address: ${payport}`)
      }
      return { address: this.toChecksumAddress(payport) }
    }

    if (!await this.isValidPayport(payport)) {
      throw new Error(`Invalid Ethereum payport: ${JSON.stringify(payport)}`)
    } else {
      if(!await this.isValidAddress(payport.address)) {
        throw new Error(`Invalid Ethereum payport: ${JSON.stringify(payport)}`)
      }
    }

    return { ...payport, address: this.toChecksumAddress(payport.address) }
  }

  async resolveFromTo(from: number, to: ResolveablePayport): Promise<FromTo> {
    const fromPayport = await this.getPayport(from)
    const toPayport = await this.resolvePayport(to)
    return {
      fromAddress: fromPayport.address,
      fromIndex: from,
      fromExtraId: fromPayport.extraId,
      fromPayport,
      toAddress: toPayport.address,
      toIndex: typeof to === 'number' ? to : null,
      toExtraId: toPayport.extraId,
      toPayport,
    }
  }

  async resolveFeeOption(
    feeOption: FeeOption,
    amountOfGas: string = ETHEREUM_TRANSFER_COST,
  ): Promise<EthereumResolvedFeeOption> {
    if (new BigNumber(amountOfGas).dp() > 0) {
      throw new Error(`Amount of gas must be a whole number ${amountOfGas}`)
    }
    return isType(FeeOptionCustom, feeOption)
      ? this.resolveCustomFeeOption(feeOption, amountOfGas)
      : this.resolveLeveledFeeOption(feeOption.feeLevel, amountOfGas)
  }

  resolveCustomFeeOption(
    feeOption: FeeOptionCustom,
    amountOfGas: string,
  ): EthereumResolvedFeeOption {
    const { feeRate, feeRateType } = feeOption

    // Determine the gas price first
    let gasPrice: BigNumber
    if (feeRateType === FeeRateType.BasePerWeight) {
      gasPrice = new BigNumber(feeRate)
    } else {
      const feeRateBase = feeRateType === FeeRateType.Main
        ? this.toBaseDenominationBigNumberEth(feeRate)
        : new BigNumber(feeRate)
      gasPrice = feeRateBase.dividedBy(amountOfGas)
    }
    gasPrice = gasPrice.dp(0, BigNumber.ROUND_DOWN) // Round down to avoid exceeding target

    // Calculate the actual total fees after gas price is rounded
    const feeBase = gasPrice.multipliedBy(amountOfGas)
    const feeMain = this.toMainDenominationBigNumberEth(feeBase)

    return {
      targetFeeRate:     feeOption.feeRate,
      targetFeeLevel:    FeeLevel.Custom,
      targetFeeRateType: feeOption.feeRateType,
      feeBase:           feeBase.toFixed(),
      feeMain:           feeMain.toFixed(),
      gasPrice:          gasPrice.toFixed(),
    }
  }

  async resolveLeveledFeeOption(
    feeLevel: AutoFeeLevels = DEFAULT_FEE_LEVEL,
    amountOfGas: string,
  ): Promise<EthereumResolvedFeeOption> {
    const gasPrice = new BigNumber(
      await this.gasStation.getGasPrice(feeLevel)
    ).dp(0, BigNumber.ROUND_DOWN)

    const feeBase = gasPrice.multipliedBy(amountOfGas).toFixed()

    return {
      targetFeeRate: gasPrice.toFixed(),
      targetFeeLevel: feeLevel,
      targetFeeRateType: FeeRateType.BasePerWeight,
      feeBase,
      feeMain: this.toMainDenominationEth(feeBase),
      gasPrice: gasPrice.toFixed(),
    }
  }

  abstract getAccountIds(): string[]

  abstract getAccountId(index: number): string

  requiresBalanceMonitor() {
    return false
  }

  async getAvailableUtxos() {
    return []
  }

  async getUtxos() {
    return []
  }

  usesSequenceNumber() {
    return true
  }

  usesUtxos() {
    return false
  }

  abstract async getPayport(index: number): Promise<Payport>

  async getBalance(resolveablePayport: ResolveablePayport): Promise<BalanceResult> {
    const payport = await this.resolvePayport(resolveablePayport)
    const balance = await this.eth.getBalance(payport.address)
    const sweepable = await this.isSweepableBalance(balance)
    const confirmedBalance = this.toMainDenomination(balance).toString()

    return {
      confirmedBalance,
      unconfirmedBalance: '0',
      spendableBalance: confirmedBalance,
      sweepable,
      requiresActivation: false,
    }
  }

  async isSweepableBalance(balanceEth: string): Promise<boolean> {
    const feeOption = await this.resolveFeeOption({})

    const feeWei = new BigNumber(feeOption.feeBase)
    const balanceWei = new BigNumber(this.toBaseDenomination(balanceEth))

    if (balanceWei.minus(feeWei).isLessThanOrEqualTo(0)) {
      return false
    }
    return true
  }

  async getNextSequenceNumber(payport: ResolveablePayport) {
    const resolvedPayport = await this.resolvePayport(payport)
    const sequenceNumber = await this.gasStation.getNonce(resolvedPayport.address)

    return sequenceNumber
  }

  async getTransactionInfo(txid: string): Promise<EthereumTransactionInfo> {
    // XXX it is suggested to keep 12 confirmations
    // https://ethereum.stackexchange.com/questions/319/what-number-of-confirmations-is-considered-secure-in-ethereum
    const minConfirmations = MIN_CONFIRMATIONS
    const tx = await this.eth.getTransaction(txid)
    const currentBlockNumber = await this.eth.getBlockNumber()
    let txInfo: TransactionReceipt | null = await this.eth.getTransactionReceipt(txid)

    // NOTE: for the sake of consistent schema return
    if (!txInfo) {
      txInfo = {
        transactionHash: tx.hash,
        from: tx.from ? this.toChecksumAddress(tx.from) : '',
        to: tx.to ? this.toChecksumAddress(tx.to) : '',
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
        toAddress: tx.to ? this.toChecksumAddress(tx.to) : null,
        fromAddress: tx.from ? this.toChecksumAddress(tx.from) : null,
        toExtraId: null,
        fromIndex: null,
        toIndex: null,
        fee: this.toMainDenomination((new BigNumber(tx.gasPrice)).multipliedBy(tx.gas)),
        sequenceNumber: tx.nonce,
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
        const txBlock = await this.eth.getBlock(tx.blockNumber)
        confirmationTimestamp = new Date(Number(txBlock.timestamp) * 1000)
      }
    }

    let status: TransactionStatus = TransactionStatus.Pending
    if (isConfirmed) {
      status = TransactionStatus.Confirmed
      // No trust to types description of web3
      if (txInfo.hasOwnProperty('status') && (txInfo.status === false || txInfo.status.toString() === 'false')) {
        status = TransactionStatus.Failed
      }
    }

    return {
      id: txid,
      amount: this.toMainDenomination(tx.value),
      toAddress: tx.to ? this.toChecksumAddress(tx.to) : null,
      fromAddress: tx.from ? this.toChecksumAddress(tx.from) : null,
      toExtraId: null,
      fromIndex: null,
      toIndex: null,
      fee: this.toMainDenomination((new BigNumber(tx.gasPrice)).multipliedBy(txInfo.gasUsed)),
      sequenceNumber: tx.nonce,
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

  async createTransaction(
    from: number,
    to: ResolveablePayport,
    amountEth: string,
    options: EthereumTransactionOptions = {},
  ): Promise<EthereumUnsignedTransaction> {
    this.logger.debug('createTransaction', from, to, amountEth)

    return this.createTransactionObject(from, to, amountEth, options)
  }

  async createServiceTransaction(
    from: number = this.depositKeyIndex,
    options: EthereumTransactionOptions = {},
  ): Promise<EthereumUnsignedTransaction> {
    this.logger.debug('createDepositTransaction', from)

    return this.createTransactionObject(from, undefined, '', options)
  }

  async createSweepTransaction(
    from: number | string,
    to: ResolveablePayport,
    options: EthereumTransactionOptions = {},
  ): Promise<EthereumUnsignedTransaction> {
    this.logger.debug('createSweepTransaction', from, to)

    return this.createTransactionObject(from as number, to, 'max', options)
  }

  async createMultiOutputTransaction(
    from: number,
    to: PayportOutput[],
    options: TransactionOptions = {},
  ): Promise<null> {
    return null
  }

  async signTransaction(unsignedTx: EthereumUnsignedTransaction): Promise<EthereumSignedTransaction> {
    const fromPrivateKey = await this.getPrivateKey(unsignedTx.fromIndex)
    const payport = await this.getPayport(unsignedTx.fromIndex)

    const unsignedRaw: any = cloneDeep(unsignedTx.data)

    const extraParam = this.config.network === NetworkType.Testnet ?  {chain :'ropsten'} : undefined
    const tx = new Tx(unsignedRaw, extraParam)
    const key = Buffer.from(fromPrivateKey.slice(2), 'hex')
    tx.sign(key)

    const result: EthereumSignedTransaction = {
      ...unsignedTx,
      id: `0x${tx.hash().toString('hex')}`,
      status: TransactionStatus.Signed,
      data: {
        hex: `0x${tx.serialize().toString('hex')}`
      }
    }
    this.logger.debug('signTransaction result', result)
    return result
  }

  private sendTransactionWithoutConfirmation(txHex: string): Promise<string> {
    return new Promise((resolve, reject) => this.eth.sendSignedTransaction(txHex)
        .on('transactionHash', resolve)
        .on('error', reject))
  }

  async broadcastTransaction(tx: EthereumSignedTransaction): Promise<EthereumBroadcastResult> {
    if (tx.status !== TransactionStatus.Signed) {
      throw new Error(`Tx ${tx.id} has not status ${TransactionStatus.Signed}`)
    }

    try {
      const txId = await this.sendTransactionWithoutConfirmation(tx.data.hex)
      return {
        id: txId,
      }
    } catch (e) {
      this.logger.warn(`Ethereum broadcast tx unsuccessful ${tx.id}: ${e.message}`)
      if (isString(e.message) && e.message.includes('nonce too low')) {
        throw new PaymentsError(PaymentsErrorCode.TxSequenceCollision, e.message)
      }
      throw new Error(`Ethereum broadcast tx unsuccessful: ${tx.id} ${e.message}`)
    }
  }

  abstract async getPrivateKey(index: number): Promise<string>

  private async createTransactionObject(
    from: number,
    to: ResolveablePayport | undefined,
    amountEth: string,
    options: EthereumTransactionOptions = {}
  ): Promise<EthereumUnsignedTransaction> {
    const serviceFlag = (amountEth === '' && typeof to === 'undefined')
    const sweepFlag = amountEth === 'max'
    const txType = serviceFlag ? 'CONTRACT_DEPLOY' : 'ETHEREUM_TRANSFER'

    const fromPayport = await this.getPayport(from)
    const toPayport = serviceFlag ? { address: '' } : await this.resolvePayport(to as ResolveablePayport)
    const toIndex = typeof to === 'number' ? to : null

    const txConfig: TransactionConfig = {
      from: fromPayport.address,
    }
    if (serviceFlag) {
      txConfig.data = options.data || TOKEN_WALLET_DATA
    }
    if (toPayport.address) {
      txConfig.to = toPayport.address
    }

    const amountOfGas = options.gas || await this.gasStation.estimateGas(txConfig, txType)
    const feeOption = await this.resolveFeeOption(options, amountOfGas)

    const { confirmedBalance: balanceEth } = await this.getBalance(fromPayport)
    const nonce = options.sequenceNumber || await this.getNextSequenceNumber(fromPayport.address)

    const feeWei = new BigNumber(feeOption.feeBase)
    const balanceWei = this.toBaseDenomination(balanceEth)
    let amountWei: BigNumber = new BigNumber(0)

    if (sweepFlag) {
      amountWei = (new BigNumber(balanceWei)).minus(feeWei)
      if (amountWei.isLessThan(0)) {
        throw new Error(`Insufficient balance (${balanceEth}) to sweep with fee of ${feeOption.feeMain} `)
      }
    } else if (!sweepFlag && !serviceFlag){
      amountWei = new BigNumber(this.toBaseDenomination(amountEth))
      if (amountWei.plus(feeWei).isGreaterThan(balanceWei)) {
        throw new Error(`Insufficient balance (${balanceEth}) to send ${amountEth} including fee of ${feeOption.feeMain} `)
      }
    } else {
      if ((new BigNumber(balanceWei)).isLessThan(feeWei)) {
        throw new Error(`Insufficient balance (${balanceEth}) to deployt contract with fee of ${feeOption.feeMain} `)
      }
    }

    const result: EthereumUnsignedTransaction = {
      id: null,
      status: TransactionStatus.Unsigned,
      fromAddress: fromPayport.address,
      fromIndex: from,
      toAddress: serviceFlag ? '' : toPayport.address,
      toIndex,
      toExtraId: null,
      amount: serviceFlag ? '' : this.toMainDenomination(amountWei),
      fee: feeOption.feeMain,
      targetFeeLevel: feeOption.targetFeeLevel,
      targetFeeRate: feeOption.targetFeeRate,
      targetFeeRateType: feeOption.targetFeeRateType,
      sequenceNumber: nonce.toString(),
      data: {
        ...txConfig,
        value:    `0x${amountWei.toString(16)}`,
        gas:      `0x${(new BigNumber(amountOfGas)).toString(16)}`,
        gasPrice: `0x${(new BigNumber(feeOption.gasPrice)).toString(16)}`,
        nonce:    `0x${(new BigNumber(nonce)).toString(16)}`,
      },
    }
    this.logger.debug('createTransactionObject result', result)
    return result
  }
}

export default BaseEthereumPayments
