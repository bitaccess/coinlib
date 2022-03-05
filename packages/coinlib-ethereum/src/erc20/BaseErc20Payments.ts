import { BigNumber } from 'bignumber.js'
import {
  BalanceResult,
  TransactionStatus,
  ResolveablePayport,
  Payport,
  PaymentsError,
  PaymentsErrorCode,
} from '@bitaccess/coinlib-common'
import { Numeric } from '@faast/ts-common'

import {
  BaseErc20PaymentsConfig,
  EthereumUnsignedTransaction,
  EthereumTransactionOptions,
  EthereumTransactionInfo,
} from '../types'
import {
  MIN_CONFIRMATIONS,
  TOKEN_WALLET_ABI,
  TOKEN_WALLET_ABI_LEGACY,
  TOKEN_METHODS_ABI,
  DEPOSIT_KEY_INDEX,
} from '../constants'
import { BaseEthereumPayments } from '../BaseEthereumPayments'

export abstract class BaseErc20Payments <Config extends BaseErc20PaymentsConfig> extends BaseEthereumPayments<Config> {
  public depositKeyIndex: number
  public masterAddress: string
  public tokenAddress: string

  constructor(config: Config) {
    super(config)
    if (!config.tokenAddress) {
      throw new Error(`config.tokenAddress is required to instantiate ERC20 payments`)
    }
    this.tokenAddress = config.tokenAddress.toLowerCase()
    this.masterAddress = (config.masterAddress || '').toLowerCase()

    this.depositKeyIndex = (typeof config.depositKeyIndex === 'undefined') ? DEPOSIT_KEY_INDEX : config.depositKeyIndex
  }

  abstract getAddressSalt(index: number): string
  abstract getPayport(index: number): Promise<Payport>

  async isSweepableBalance(balance: Numeric): Promise<boolean> {
    // Any ERC20 balance greater than 0 is sweepable
    return new BigNumber(balance).isGreaterThan(0)
  }

  async createTransaction(
    from: number | string,
    to: ResolveablePayport,
    amountMain: string,
    options: EthereumTransactionOptions = {},
  ): Promise<EthereumUnsignedTransaction> {
    this.logger.debug('createTransaction', from, to, amountMain)

    const fromTo = await this.resolveFromTo(from as number, to)
    const txFromAddress = fromTo.fromAddress.toLowerCase()

    const amountBase = this.toBaseDenominationBigNumber(amountMain)
    const contract = this.newContract(TOKEN_METHODS_ABI, this.tokenAddress)
    const txData = contract.methods.transfer(fromTo.toAddress, `0x${amountBase.toString(16)}`).encodeABI()

    const amountOfGas = await this.gasOptionOrEstimate(options, {
      from: fromTo.fromAddress,
      to: this.tokenAddress,
      data: txData,
    }, 'TOKEN_TRANSFER')
    const feeOption = await this.resolveFeeOption(options, amountOfGas)
    const feeBase = new BigNumber(feeOption.feeBase)

    const nonce = options.sequenceNumber || await this.getNextSequenceNumber(txFromAddress)

    const ethBalance = await this.getEthBaseBalance(fromTo.fromAddress)

    if (feeBase.isGreaterThan(ethBalance)) {
      throw new PaymentsError(
        PaymentsErrorCode.TxInsufficientBalance,
        `Insufficient ETH balance (${this.toMainDenominationEth(ethBalance)}) to pay transaction fee of ${feeOption.feeMain}`,
      )
    }

    const transactionObject = {
      from:     fromTo.fromAddress.toLowerCase(),
      to:       this.tokenAddress,
      data:     txData,
      value:    '0x0',
      gas:      `0x${amountOfGas.toString(16)}`,
      gasPrice: `0x${(new BigNumber(feeOption.gasPrice)).toString(16)}`,
      nonce:    `0x${(new BigNumber(nonce)).toString(16)}`,
    }
    this.logger.debug('transactionObject', transactionObject)

    return {
      status: TransactionStatus.Unsigned,
      id: null,
      fromAddress: fromTo.fromAddress.toLowerCase(),
      toAddress: fromTo.toAddress.toLowerCase(),
      toExtraId: null,
      fromIndex: fromTo.fromIndex,
      toIndex: fromTo.toIndex,
      amount: amountMain,
      fee: feeOption.feeMain,
      targetFeeLevel: feeOption.targetFeeLevel,
      targetFeeRate: feeOption.targetFeeRate,
      targetFeeRateType: feeOption.targetFeeRateType,
      sequenceNumber: nonce.toString(),
      weight: amountOfGas,
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
    if (from === 0) {
      const { confirmedBalance } = await this.getBalance(from as number)
      return this.createTransaction(from, to, confirmedBalance, options)
    }

    const { address: signerAddress } = await this.resolvePayport(this.depositKeyIndex)
    const { address: toAddress } = await this.resolvePayport(to)

    let txData: string
    let target: string
    let fromAddress: string
    if (typeof from === 'string') {
      // deployable wallet contract
      fromAddress = from.toLowerCase()
      target = from.toLowerCase()

      const contract = this.newContract(TOKEN_WALLET_ABI_LEGACY, from)
      txData = contract.methods.sweep(this.tokenAddress, toAddress).encodeABI()
    } else {
      // create2 selfdesctructuble proxy contract
      fromAddress = (await this.getPayport(from)).address
      target = this.masterAddress

      const { confirmedBalance } = await this.getBalance(fromAddress)
      const balance = this.toBaseDenomination(confirmedBalance)
      const contract = this.newContract(TOKEN_WALLET_ABI, this.masterAddress)
      const salt = this.getAddressSalt(from)
      txData = contract.methods.proxyTransfer(salt, this.tokenAddress, toAddress, balance).encodeABI()
    }

    const amountOfGas = await this.gasOptionOrEstimate(options, {
      from: signerAddress,
      to: target,
      data: txData
    }, 'TOKEN_SWEEP')
    const feeOption = await this.resolveFeeOption(options, amountOfGas)

    const feeBase = new BigNumber(feeOption.feeBase)
    const ethBalance = await this.getEthBaseBalance(signerAddress)
    if (feeBase.isGreaterThan(ethBalance)) {
      throw new PaymentsError(
        PaymentsErrorCode.TxInsufficientBalance,
        `Insufficient ETH balance (${this.toMainDenominationEth(ethBalance)}) at owner address ${signerAddress} `
        + `to sweep contract ${from} with fee of ${feeOption.feeMain} ETH`)
    }

    const { confirmedBalance: tokenBalanceMain } = await this.getBalance({ address: fromAddress })
    const tokenBalanceBase = this.toBaseDenominationBigNumber(tokenBalanceMain)
    if (tokenBalanceBase.isLessThan(0)) {
      throw new PaymentsError(
        PaymentsErrorCode.TxInsufficientBalance,
        `Insufficient token balance (${tokenBalanceMain}) to sweep`,
      )
    }

    const nonce = options.sequenceNumber || await this.getNextSequenceNumber(signerAddress)
    const transactionObject = {
      from:     signerAddress,
      to:       target,
      data:     txData,
      value:    '0x0',
      nonce:    `0x${(new BigNumber(nonce)).toString(16)}`,
      gasPrice: `0x${(new BigNumber(feeOption.gasPrice)).toString(16)}`,
      gas:      `0x${amountOfGas.toString(16)}`,
    }

    return {
      status: TransactionStatus.Unsigned,
      id: null,
      fromAddress,
      toAddress,
      toExtraId: null,
      fromIndex: this.depositKeyIndex,
      toIndex: typeof to === 'number' ? to : null,
      amount: tokenBalanceMain,
      fee: feeOption.feeMain,
      targetFeeLevel: feeOption.targetFeeLevel,
      targetFeeRate: feeOption.targetFeeRate,
      targetFeeRateType: feeOption.targetFeeRateType,
      sequenceNumber: nonce.toString(),
      weight: amountOfGas,
      data: transactionObject,
    }
  }

  async getNextSequenceNumber(payport: ResolveablePayport): Promise<string> {
    const resolvedPayport = await this.resolvePayport(payport)
    const sequenceNumber = await this.networkData.getNonce(resolvedPayport.address)

    return sequenceNumber
  }

  private async getEthBaseBalance(address: string): Promise<BigNumber> {
    const balanceBase = await this._retryDced(() => this.eth.getBalance(address))

    return new BigNumber(balanceBase)
  }

  private logTopicToAddress(value: string): string {
    return `0x${value.slice(value.length - 40)}`
  }
}

export default BaseErc20Payments
