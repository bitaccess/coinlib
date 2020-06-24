import { BigNumber } from 'bignumber.js'
import {
  BalanceResult,
  TransactionStatus,
  FeeLevel,
  FeeOption,
  FeeRateType,
  FeeOptionCustom,
  ResolveablePayport,
  CreateTransactionOptions as TransactionOptions,
  FromTo,
} from '@faast/payments-common'
import {
  isType,
  isNumber,
  Numeric,
} from '@faast/ts-common'

import {
  BaseErc20PaymentsConfig,
  EthereumUnsignedTransaction,
  EthereumResolvedFeeOption,
  EthereumTransactionOptions,
} from '../types'
import {
  DEFAULT_FEE_LEVEL,
  FEE_LEVEL_MAP,
  MIN_CONFIRMATIONS,
  TOKEN_WALLET_DATA,
  TOKEN_WALLET_ABI,
  TOKEN_TRANSFER_COST,
  TOKEN_METHODS_ABI,
  DEPOSIT_KEY_INDEX,
  DECIMAL_PLACES,
} from '../constants'
import { BaseEthereumPayments } from '../BaseEthereumPayments'
import { EthereumPaymentsUtils } from '../EthereumPaymentsUtils'

export abstract class BaseErc20Payments <Config extends BaseErc20PaymentsConfig> extends BaseEthereumPayments<Config> {
  public tokenAddress: string
  public depositKeyIndex: number

  constructor(config: Config) {
    super(config)
    this.tokenAddress = config.tokenAddress

    this.depositKeyIndex = (typeof config.depositKeyIndex === 'undefined') ? DEPOSIT_KEY_INDEX : config.depositKeyIndex
  }

  async getBalance(resolveablePayport: ResolveablePayport): Promise<BalanceResult> {
    const payport = await this.resolvePayport(resolveablePayport)
    const contract = new this.eth.Contract(TOKEN_METHODS_ABI, this.tokenAddress)
    const balance = await contract.methods.balanceOf(payport.address).call({})

    const sweepable = await this.isSweepableBalance(this.toMainDenomination(balance))

    return {
      confirmedBalance: this.toMainDenomination(balance),
      unconfirmedBalance: '0',
      spendableBalance: this.toMainDenomination(balance),
      sweepable,
      requiresActivation: false,
    }
  }

  async isSweepableBalance(balance: string): Promise<boolean> {
    const feeOption = await this.resolveFeeOption({})
    const payport = await this.resolvePayport(this.depositKeyIndex)

    const feeWei = new BigNumber(feeOption.feeBase)
    const balanceWei = await this.eth.getBalance(payport.address)

    if (balanceWei === '0' || balance === '0') {
      return false
    }

    return ((new BigNumber(balanceWei)).isGreaterThanOrEqualTo(feeWei))
  }

  async createTransaction(
    from: number | string,
    to: ResolveablePayport,
    amountMain: string,
    options: EthereumTransactionOptions = {},
  ): Promise<EthereumUnsignedTransaction> {
    this.logger.debug('createTransaction', from, to, amountMain)

    const fromTo = await this.resolveFromTo(from as number, to)
    const txFromAddress = fromTo.fromAddress

    const amountOfGas = await this.gasStation.estimateGas(fromTo.fromAddress, fromTo.toAddress, 'TOKEN_TRANSFER')
    const feeOption: EthereumResolvedFeeOption = isType(FeeOptionCustom, options)
      ? this.resolveCustomFeeOptionABI(options, amountOfGas)
      : await this.resolveLeveledFeeOptionABI(options, amountOfGas)
    const feeBase = new BigNumber(feeOption.feeBase)

    const nonce = options.sequenceNumber || await this.getNextSequenceNumber(txFromAddress)

    let amount = new BigNumber(this.toBaseDenomination(amountMain))
    let ethBalance = await this.getEthBaseBalance(fromTo.fromAddress)

    const { confirmedBalance: balanceMain } = await this.getBalance(fromTo.fromPayport)
    const balanceBase = this.toBaseDenomination(balanceMain)
    if ((feeBase).isGreaterThan(ethBalance)) {
      throw new Error(`Insufficient balance (${ethBalance}) to pay transaction fee of ${feeOption.feeMain}`)
    }

    const contract = new this.eth.Contract(TOKEN_METHODS_ABI, this.tokenAddress)
    const transactionObject = {
      from:     fromTo.fromAddress,
      to:       this.tokenAddress,
      value:    '0x0',
      gas:      `0x${(new BigNumber(amountOfGas)).toString(16)}`,
      gasPrice: `0x${(new BigNumber(feeOption.gasPrice)).toString(16)}`,
      nonce:    `0x${(new BigNumber(nonce)).toString(16)}`,
      data: contract.methods.transfer(fromTo.toAddress, `0x${amount.toString(16)}`).encodeABI()
    }

    return {
      status: TransactionStatus.Unsigned,
      id: '',
      fromAddress: fromTo.fromAddress,
      toAddress: fromTo.toAddress,
      toExtraId: null,
      fromIndex: fromTo.fromIndex,
      toIndex: fromTo.toIndex,
      amount: this.toMainDenomination(amount),
      fee: feeOption.feeMain,
      targetFeeLevel: feeOption.targetFeeLevel,
      targetFeeRate: feeOption.targetFeeRate,
      targetFeeRateType: feeOption.targetFeeRateType,
      sequenceNumber: nonce.toString(),
      data: transactionObject,
    }
  }

  async createSweepTransaction(
    from: string | number,
    to: ResolveablePayport,
    options: EthereumTransactionOptions = {},
  ): Promise<EthereumUnsignedTransaction> {
    this.logger.debug('createSweepTransaction', from, to)

    // NOTE sweep from hot wallet which is not guaranteed to support sweep contract execution
    if (isNumber(from)) {
      const { confirmedBalance } = await this.getBalance(from)
      return this.createTransaction(from, to, confirmedBalance, options)
    }

    const toPayport = await this.resolvePayport(to)
    const fromPayport = await this.resolvePayport(this.depositKeyIndex)
    const txFromAddress = fromPayport.address
    const fromTo = {
      fromAddress: `${from}`,
      fromIndex: this.depositKeyIndex,
      fromExtraId: null,
      fromPayport: { address: `${from}` },

      toAddress: toPayport.address,
      toIndex: typeof to === 'number' ? to : null,
      toExtraId: toPayport.extraId,
      toPayport,
    }

    const amountOfGas = await this.gasStation.estimateGas(fromTo.fromAddress, fromTo.toAddress, 'TOKEN_SWEEP')
    const feeOption: EthereumResolvedFeeOption = isType(FeeOptionCustom, options)
      ? this.resolveCustomFeeOptionABI(options, amountOfGas)
      : await this.resolveLeveledFeeOptionABI(options, amountOfGas)

    const feeBase = new BigNumber(feeOption.feeBase)

    let ethBalance = await this.getEthBaseBalance(fromPayport.address)
    const { confirmedBalance: balanceMain } = await this.getBalance(fromTo.fromPayport)
    const balanceBase = this.toBaseDenomination(balanceMain)
    const amount = (new BigNumber(balanceBase))
    if ((feeBase).isGreaterThan(ethBalance)) {
      throw new Error(`Insufficient ${fromPayport.address}/${fromTo.fromAddress} balance (${ethBalance}) to sweep with fee of ${feeOption.feeMain} `)
    }

    if ((new BigNumber(balanceBase)).isLessThan(0)) {
      throw new Error(`Insufficient balance (${balanceMain}) to sweep`)
    }

    const nonce = options.sequenceNumber || await this.getNextSequenceNumber(txFromAddress)
    const contract = new this.eth.Contract(TOKEN_WALLET_ABI, fromTo.fromAddress)
    const transactionObject = {
      nonce:    `0x${(new BigNumber(nonce)).toString(16)}`,
      to:       fromTo.fromAddress,
      gasPrice: `0x${(new BigNumber(feeOption.gasPrice)).toString(16)}`,
      gas:      `0x${(new BigNumber(amountOfGas)).toString(16)}`,
      data: contract.methods.sweep(this.tokenAddress, fromTo.toAddress).encodeABI()
    }

    return {
      status: TransactionStatus.Unsigned,
      id: '',
      fromAddress: fromTo.fromAddress,
      toAddress: fromTo.toAddress,
      toExtraId: null,
      fromIndex: this.depositKeyIndex,
      toIndex: fromTo.toIndex,
      amount: this.toMainDenomination(amount),
      fee: feeOption.feeMain,
      targetFeeLevel: feeOption.targetFeeLevel,
      targetFeeRate: feeOption.targetFeeRate,
      targetFeeRateType: feeOption.targetFeeRateType,
      sequenceNumber: nonce.toString(),
      data: transactionObject,
    }
  }

  private resolveCustomFeeOptionABI(
    feeOption: FeeOptionCustom,
    amountOfGas: string = TOKEN_TRANSFER_COST,
  ): EthereumResolvedFeeOption {
    const isWeight = (feeOption.feeRateType === FeeRateType.BasePerWeight)
    const isMain = (feeOption.feeRateType === FeeRateType.Main)

    const gasPrice = isWeight
      ? feeOption.feeRate
      : (new BigNumber(feeOption.feeRate)).dividedBy(amountOfGas).toString()
    const fee = isWeight
      ? (new BigNumber(feeOption.feeRate)).multipliedBy(amountOfGas).toString()
      : feeOption.feeRate

    return {
      targetFeeRate:     feeOption.feeRate,
      targetFeeLevel:    FeeLevel.Custom,
      targetFeeRateType: feeOption.feeRateType,
      feeBase:           isMain ? this.toBaseDenominationEth(fee) : fee,
      feeMain:           isMain ? fee : this.toMainDenominationEth(fee),
      gasPrice:          isMain ? this.toBaseDenominationEth(gasPrice) : gasPrice
    }
  }

  private async resolveLeveledFeeOptionABI(
    feeOption: FeeOption,
    amountOfGas: string = TOKEN_TRANSFER_COST,
  ): Promise<EthereumResolvedFeeOption> {
    const targetFeeLevel = feeOption.feeLevel || DEFAULT_FEE_LEVEL
    const targetFeeRate = await this.gasStation.getGasPrice(FEE_LEVEL_MAP[targetFeeLevel])

    const feeBase = (new BigNumber(targetFeeRate)).multipliedBy(amountOfGas).toString()

    return {
      targetFeeRate,
      targetFeeLevel,
      targetFeeRateType: FeeRateType.BasePerWeight,
      feeBase,
      feeMain: this.toMainDenominationEth(feeBase),
      gasPrice: targetFeeRate,
    }
  }

  async getNextSequenceNumber(payport: ResolveablePayport): Promise<string> {
    const resolvedPayport = await this.resolvePayport(payport)
    const sequenceNumber = await this.gasStation.getNonce(resolvedPayport.address)

    return sequenceNumber
  }

  private async getEthBaseBalance(address: string): Promise<BigNumber> {
    const balanceBase = await this.eth.getBalance(address)

    return new BigNumber(balanceBase)
  }

  private toBaseDenominationEth(amount: Numeric): string {
    const ePU = new EthereumPaymentsUtils(Object.assign({}, this.getPublicConfig(), { decimals: DECIMAL_PLACES }))
    return ePU.toBaseDenomination(amount)
  }

  private toMainDenominationEth(amount: Numeric): string {
    const ePU = new EthereumPaymentsUtils(Object.assign({}, this.getPublicConfig(), { decimals: DECIMAL_PLACES }))
    return ePU.toMainDenomination(amount)
  }
}

export default BaseErc20Payments
