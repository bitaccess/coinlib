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
  FromTo,
} from '@faast/payments-common'
import { isType } from '@faast/ts-common'

import {
  Erc20UnsignedTransaction,
  BaseErc20PaymentsConfig,
  Erc20ResolvedFeeOption,
  Erc20TransactionOptions,
} from './types'
import {
  DEFAULT_FEE_LEVEL,
  FEE_LEVEL_MAP,
  MIN_CONFIRMATIONS,
  TOKEN_WALLET_DATA,
  TOKEN_WALLET_ABI,
  TOKEN_TRANSFER_COST,
  TOKEN_METHODS_ABI,
  DEPOSIT_KEY_INDEX,
} from '../constants'
import { BaseEthereumPayments } from '../BaseEthereumPayments'

export abstract class BaseErc20Payments <Config extends BaseErc20PaymentsConfig> extends BaseEthereumPayments<Config> {
  private abi: any //AbiItem | AbiItem[]
  private contractAddres: string
  private sweepABI: any //AbiItem | AbiItem[]
  public depositKeyIndex: number

  constructor(config: Config) {
    super(config)

    this.abi = JSON.parse(config.abi || TOKEN_METHODS_ABI)
    this.sweepABI = JSON.parse(TOKEN_WALLET_ABI)
    this.contractAddres = config.contractAddres || ''

    this.depositKeyIndex = (typeof config.depositKeyIndex === 'undefined') ? DEPOSIT_KEY_INDEX : config.depositKeyIndex
  }

  async resolveFeeOption(feeOption: FeeOption): Promise<Erc20ResolvedFeeOption> {
    return isType(FeeOptionCustom, feeOption)
      ? this.resolveCustomFeeOptionABI(feeOption)
      : this.resolveLeveledFeeOptionABI(feeOption)
  }

  async getBalance(resolveablePayport: ResolveablePayport): Promise<BalanceResult> {
    const payport = await this.resolvePayport(resolveablePayport)
    const contract = new this.eth.Contract(this.abi, this.contractAddres)
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

  async createTransaction(
    from: number,
    to: ResolveablePayport,
    amountBase: string,
    options: TransactionOptions = {},
  ): Promise<Erc20UnsignedTransaction> {
    this.logger.debug('createTransaction', from, to, amountBase)

    return this.createTransactionObjectABI(from, to, amountBase, options)
  }

  // should accept string address as `from`
  async createSweepTransaction(
    from: number | string,
    to: ResolveablePayport,
    options: TransactionOptions = {},
  ): Promise<Erc20UnsignedTransaction> {
    this.logger.debug('createSweepTransaction', from, to)

    return this.createTransactionObjectABI(from as string, to, 'max', options)
  }

  async createDepositTransaction(
    options: Erc20TransactionOptions = {},
  ): Promise<Erc20UnsignedTransaction> {
    this.logger.debug('createDepositTransaction', this.depositKeyIndex)
    const payport = await this.resolvePayport(this.depositKeyIndex)
    const feeOption = await this.resolveFeeOption(options as FeeOption)
    const targetFeeLevel = feeOption.targetFeeLevel || DEFAULT_FEE_LEVEL

    const {
      pricePerGasUnit,
      amountOfGas,
      nonce: networkNonce
    } = await this.gasStation.getNetworkData('CONTRACT_DEPLOY', payport.address, '', FEE_LEVEL_MAP[targetFeeLevel])

    let bnNonce = new BigNumber(networkNonce)

    // TODO do BN conversion in NetworkData
    const transactionObject = {
      nonce: `0x${bnNonce.toString(16)}`,
      gasPrice: `0x${(new BigNumber(pricePerGasUnit)).toString(16)}`,
      gas: `0x${(new BigNumber(options.gas || amountOfGas)).toString(16)}`,
      data: options.data || TOKEN_WALLET_DATA,
    }

    return {
      id: '',
      status: TransactionStatus.Unsigned,

      fromAddress: payport.address,
      toAddress: '',
      fromIndex: this.depositKeyIndex,
      toIndex: null,
      toExtraId: null,

      amount: '',

      fee: feeOption.feeMain,
      targetFeeLevel: feeOption.targetFeeLevel,
      targetFeeRate: feeOption.targetFeeRate,
      targetFeeRateType: feeOption.targetFeeRateType,
      sequenceNumber: bnNonce.toString(),

      data: transactionObject,
    }
  }

  private resolveCustomFeeOptionABI(
    feeOption: FeeOptionCustom,
    amountOfGas: string = TOKEN_TRANSFER_COST,
  ): Erc20ResolvedFeeOption {
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
      feeBase:           isMain ? this.toBaseDenomination(fee) : fee,
      feeMain:           isMain ? fee : this.toMainDenomination(fee),
      gasPrice:          isMain ? this.toBaseDenomination(gasPrice) : gasPrice
    }
  }

  private async resolveLeveledFeeOptionABI(
    feeOption: FeeOption,
    amountOfGas: string = TOKEN_TRANSFER_COST,
  ): Promise<Erc20ResolvedFeeOption> {
    const targetFeeLevel = feeOption.feeLevel || DEFAULT_FEE_LEVEL
    const targetFeeRate = await this.gasStation.getGasPrice(FEE_LEVEL_MAP[targetFeeLevel])

    const feeBase = (new BigNumber(targetFeeRate)).multipliedBy(amountOfGas).toString()

    return {
      targetFeeRate,
      targetFeeLevel,
      targetFeeRateType: FeeRateType.BasePerWeight,
      feeBase,
      feeMain: this.toMainDenomination(feeBase),
      gasPrice: targetFeeRate,
    }
  }

  async getNextSequenceNumber(payport: ResolveablePayport): Promise<string> {
    const resolvedPayport = await this.resolvePayport(payport)
    const sequenceNumber = await this.gasStation.getNonce(resolvedPayport.address)

    return sequenceNumber
  }

  private async createTransactionObjectABI(
    from: number | string,
    to: ResolveablePayport,
    amountMain: string = 'max',
    options: TransactionOptions = {}
  ): Promise<Erc20UnsignedTransaction> {
    const sweepFlag = amountMain === 'max' ? true : false
    const action = sweepFlag ? 'TOKEN_SWEEP' : 'TOKEN_TRANSFER'

    let fromTo: FromTo
    let txFromAddress: string
    if (typeof from === 'number') {
      fromTo = await this.resolveFromTo(from, to)
      txFromAddress = fromTo.fromAddress
    } else {
      const toPayport = await this.resolvePayport(to)
      const fromPayport = await this.resolvePayport(this.depositKeyIndex)
      txFromAddress = fromPayport.address
      fromTo = {
        fromAddress: from,
        fromIndex: this.depositKeyIndex,
        fromExtraId: null,
        fromPayport: { address: from },

        toAddress: toPayport.address,
        toIndex: typeof to === 'number' ? to : null,
        toExtraId: toPayport.extraId,
        toPayport,
      }
    }

    const amountOfGas = await this.gasStation.estimateGas(fromTo.fromAddress, fromTo.toAddress, action)

    const feeOption: Erc20ResolvedFeeOption = isType(FeeOptionCustom, options)
      ? this.resolveCustomFeeOptionABI(options, amountOfGas)
      : await this.resolveLeveledFeeOptionABI(options, amountOfGas)

    const { confirmedBalance: balanceMain } = await this.getBalance(fromTo.fromPayport)
    const balanceBase = this.toBaseDenomination(balanceMain)

    const nonce = options.sequenceNumber || await this.getNextSequenceNumber(txFromAddress)

    const feeBase = new BigNumber(feeOption.feeBase)

    let amount: BigNumber
    let transactionObject: Object
    if (sweepFlag) {
      amount = (new BigNumber(balanceBase))
      if (amount.isLessThan(0)) {
        throw new Error(`Insufficient balance (${balanceMain}) to sweep with fee of ${feeOption.feeMain} `)
      }

      const contract = new this.eth.Contract(this.sweepABI, fromTo.fromAddress)
      transactionObject = {
        nonce:    `0x${(new BigNumber(nonce)).toString(16)}`,
        to:       fromTo.fromAddress,
        gasPrice: `0x${(new BigNumber(feeOption.gasPrice)).toString(16)}`,
        gas:      `0x${(new BigNumber(amountOfGas)).toString(16)}`,
        data: contract.methods.sweep(this.contractAddres, fromTo.toAddress).encodeABI()
      }
    } else {
      amount = new BigNumber(this.toBaseDenomination(amountMain))
      if (amount.plus(feeBase).isGreaterThan(balanceBase)) {
        throw new Error(`Insufficient balance (${balanceMain}) to send ${amountMain} including fee of ${feeOption.feeMain} `)
      }
      const contract = new this.eth.Contract(this.abi, this.contractAddres)
      transactionObject = {
        from:     fromTo.fromAddress,
        to:       this.contractAddres,
        value:    '0x0',
        gas:      `0x${(new BigNumber(amountOfGas)).toString(16)}`,
        gasPrice: `0x${(new BigNumber(feeOption.gasPrice)).toString(16)}`,
        nonce:    `0x${(new BigNumber(nonce)).toString(16)}`,
        data: contract.methods.transfer(fromTo.toAddress, `0x${amount.toString(16)}`).encodeABI()
      }
    }

    return {
      status: TransactionStatus.Unsigned,
      id: '',
      // XXX addresses in actual transaction are different due to use of contract
      fromAddress: fromTo.fromAddress,
      toAddress: fromTo.toAddress,
      toExtraId: null,
      // NOTE: used to sign transaction
      // sweeps must be signed with key which created deposit addresses
      fromIndex: sweepFlag ? this.depositKeyIndex : fromTo.fromIndex,
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
