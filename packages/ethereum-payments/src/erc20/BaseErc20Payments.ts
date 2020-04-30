import { BigNumber } from 'bignumber.js'
import Web3 from 'web3'
import { TransactionReceipt } from 'web3-core';
import {
  BalanceResult,
  TransactionStatus,
  FeeLevel,
  FeeOption,
  FeeRateType,
  FeeOptionCustom,
  ResolveablePayport,
  CreateTransactionOptions as TransactionOptions,
} from '@faast/payments-common'
import { isType } from '@faast/ts-common'

import {
  Erc20UnsignedTransaction,
  BaseErc20PaymentsConfig,
  Erc20ResolvedFeeOption,
} from './types'
import {
  DEFAULT_FEE_LEVEL,
  FEE_LEVEL_MAP,
  MIN_CONFIRMATIONS,
  TOKEN_WALLET_DATA,
  TOKEN_TRANSFER_COST,
} from '../constants'
import { BaseEthereumPayments } from '../BaseEthereumPayments'

export abstract class BaseErc20Payments <Config extends BaseErc20PaymentsConfig> extends BaseEthereumPayments<Config> {
  private abi: any // JSON/string?
  private contractOwnerAddres: string

  constructor(config: Config) {
    super(config)

    this.abi = config.abi
    this.contractOwnerAddres = config.contractOwnerAddres || '' //||  //XXX use hd key
  }

  async resolveFeeOption(feeOption: FeeOption): Promise<Erc20ResolvedFeeOption> {
    return isType(FeeOptionCustom, feeOption)
      ? this.resolveCustomFeeOptionABI(feeOption)
      : this.resolveLeveledFeeOptionABI(feeOption)
  }

  async getBalance(resolveablePayport: ResolveablePayport): Promise<BalanceResult> {
    const payport = await this.resolvePayport(resolveablePayport)
    // XXX should it be contractOwnerAddres?
    const contract = new this.eth.Contract(this.abi, payport.address)
    const balance = await contract.methods.balanceOf(payport.address)
    const sweepable = await this.isSweepableBalance(this.toMainDenomination(balance))

    return {
      confirmedBalance: this.toMainDenomination(balance),
      unconfirmedBalance: '0',
      spendableBalance: this.toMainDenomination(balance),
      sweepable,
      requiresActivation: false,
    }
  }

  async createTransaction(
    from: number,
    to: ResolveablePayport,
    amountBase: string,
    options: TransactionOptions = {},
  ): Promise<Erc20UnsignedTransaction> {
    this.logger.debug('createTransaction', from, to, amountBase)

    return this.createTransactionObjectABI(from, to, amountBase, options)
  }

  async createSweepTransaction(
    from: number,
    to: ResolveablePayport,
    options: TransactionOptions = {},
  ): Promise<Erc20UnsignedTransaction> {
    this.logger.debug('createSweepTransaction', from, to)

    return this.createTransactionObjectABI(from, to, 'max', options)
  }

  async createDepositTransaction(
    from: number,
    options: TransactionOptions = {},
  ): Promise<Erc20UnsignedTransaction> {
    this.logger.debug('createDepositTransaction', from)

    const action = 'CONTRACT_DEPLOY'
    const payport = await this.resolvePayport(from)
    const feeOption = await this.resolveFeeOption(options as FeeOption)
    const targetFeeLevel = feeOption.targetFeeLevel || DEFAULT_FEE_LEVEL

    const {
      pricePerGasUnit,
      amountOfGas,
      nonce: networkNonce
    } = await this.gasStation.getNetworkData(action, payport.address, '', FEE_LEVEL_MAP[targetFeeLevel])

    const transactionObject = {
      nonce: networkNonce,
      gasPrice: pricePerGasUnit,
      gasLimit: amountOfGas,
      data: TOKEN_WALLET_DATA,
    }

    return {
      id: '',
      status: TransactionStatus.Unsigned,

      fromAddress: payport.address,
      toAddress: '',
      fromIndex: from,
      toIndex: null,
      toExtraId: null,

      amount: '',

      fee: feeOption.feeMain,
      targetFeeLevel: feeOption.targetFeeLevel,
      targetFeeRate: feeOption.targetFeeRate,
      targetFeeRateType: feeOption.targetFeeRateType,
      sequenceNumber: networkNonce,

      data: transactionObject,
    }
  }

  private resolveCustomFeeOptionABI(feeOption: FeeOptionCustom): Erc20ResolvedFeeOption {
    const isBasePerWeight = (feeOption.feeRateType === FeeRateType.BasePerWeight)
    const isMain = (feeOption.feeRateType === FeeRateType.Main)

    const gasPrice = isBasePerWeight
      ? feeOption.feeRate
      : (new BigNumber(feeOption.feeRate)).dividedBy(TOKEN_TRANSFER_COST).toString()
    const fee = isBasePerWeight
      ? (new BigNumber(feeOption.feeRate)).multipliedBy(TOKEN_TRANSFER_COST).toString()
      : feeOption.feeRate

    return {
      targetFeeRate:     feeOption.feeRate,
      targetFeeLevel:    FeeLevel.Custom,
      targetFeeRateType: feeOption.feeRateType,
      feeBase:           isMain ? this.toBaseDenomination(fee) : fee,
      feeMain:           isMain ? fee : this.toMainDenomination(fee),
      gasPrice:          isMain ? this.toBaseDenomination(gasPrice, { rounding: 7 }) : gasPrice
    }
  }

  private async resolveLeveledFeeOptionABI(feeOption: FeeOption): Promise<Erc20ResolvedFeeOption> {
    const targetFeeLevel = feeOption.feeLevel || DEFAULT_FEE_LEVEL
    const targetFeeRate = await this.gasStation.getGasPrice(FEE_LEVEL_MAP[targetFeeLevel])
    const feeBase = (new BigNumber(targetFeeRate)).multipliedBy(TOKEN_TRANSFER_COST).toString()

    return {
      targetFeeRate,
      targetFeeLevel,
      targetFeeRateType: FeeRateType.BasePerWeight,
      feeBase,
      feeMain: this.toMainDenomination(feeBase),
      gasPrice: targetFeeRate,
    }
  }

  private async createTransactionObjectABI(
    from: number,
    to: ResolveablePayport,
    amountEth: string = 'max',
    options: TransactionOptions = {}
  ): Promise<Erc20UnsignedTransaction> {
    const sweepFlag = amountEth === 'max' ? true : false
    const action = sweepFlag ? 'TOKEN_SWEEP' : 'TOKEN_TRANSFER'

    const fromTo = await this.resolveFromTo(from, to)
    const feeOption = await this.resolveFeeOption(options as FeeOption)
    const targetFeeLevel = feeOption.targetFeeLevel || DEFAULT_FEE_LEVEL
    const { confirmedBalance: balanceBase } = await this.getBalance(fromTo.fromPayport)
    const {
      pricePerGasUnit,
      amountOfGas,
      nonce: networkNonce
    } = await this.gasStation.getNetworkData(action, fromTo.fromAddress, fromTo.toAddress, FEE_LEVEL_MAP[targetFeeLevel])

    const nonce = options.sequenceNumber || networkNonce

    const feeBase = new BigNumber(feeOption.feeBase)
    const balance = this.toBaseDenomination(balanceBase)

    let amount: BigNumber
    if (sweepFlag) {
      amount = (new BigNumber(balance)).minus(feeBase)
      if (amount.isLessThan(0)) {
        throw new Error(`Insufficient balance (${balance}) to sweep with fee of ${feeOption.feeMain} `)
      }
    } else {
      amount = new BigNumber(this.toBaseDenomination(amountEth))
      if (amount.plus(feeBase).isGreaterThan(balance)) {
        throw new Error(`Insufficient balance (${balance}) to send ${amount} including fee of ${feeOption.feeMain} `)
      }
    }

    // XXX should it be contractOwnerAddres?
    const contract = new this.eth.Contract(this.abi, fromTo.fromAddress)
    const data = contract.methods.transfer(fromTo.toAddress, amount).encodeABI()
    const transactionObject = {
      from:     fromTo.fromAddress,
      to:       fromTo.toAddress,
      value:    `0x${amount.toString(16)}`,
      gas:      `0x${(new BigNumber(amountOfGas)).toString(16)}`,
      gasPrice: `0x${(new BigNumber(feeOption.gasPrice)).toString(16)}`,
      nonce:    `0x${(new BigNumber(nonce)).toString(16)}`,
      data
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
}

export default BaseErc20Payments
