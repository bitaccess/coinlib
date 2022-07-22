import {
  BalanceResult,
  TransactionStatus,
  ResolveablePayport,
  Payport,
  PaymentsError,
  PaymentsErrorCode,
  BigNumber,
  numericToHex,
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
  public masterAddress: string | null
  public tokenAddress: string

  constructor(config: Config) {
    super(config)
    if (!config.tokenAddress) {
      throw new Error(`config.tokenAddress is required to instantiate ERC20 payments`)
    }
    this.tokenAddress = this.standardizeAddressOrThrow(config.tokenAddress)
    this.masterAddress = config.masterAddress
      ? this.standardizeAddress(config.masterAddress)
      : null

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
    const { fromAddress, toAddress } = fromTo

    const amountBase = this.toBaseDenominationBigNumber(amountMain)
    const contract = this.newContract(TOKEN_METHODS_ABI, this.tokenAddress)
    const txData = contract.methods.transfer(toAddress, numericToHex(amountBase)).encodeABI()

    const amountOfGas = await this.gasOptionOrEstimate(options, {
      from: fromAddress,
      to: this.tokenAddress,
      data: txData,
    }, 'TOKEN_TRANSFER')
    const feeOption = await this.resolveFeeOption(options, amountOfGas)
    const feeBase = new BigNumber(feeOption.feeBase)

    const nonce = options.sequenceNumber || await this.getNextSequenceNumber(fromAddress)

    const ethBalance = await this.getEthBaseBalance(fromAddress)

    if (feeBase.isGreaterThan(ethBalance)) {
      throw new PaymentsError(
        PaymentsErrorCode.TxInsufficientBalance,
        `Insufficient ${this.nativeCoinSymbol} balance (${this.toMainDenominationNative(ethBalance)}) to pay transaction fee of ${feeOption.feeMain}`,
      )
    }

    const transactionObject = {
      from: fromAddress,
      to: this.tokenAddress,
      data: txData,
      value: numericToHex(0),
      gas: numericToHex(amountOfGas),
      gasPrice: numericToHex(feeOption.gasPrice),
      nonce: numericToHex(nonce),
    }
    this.logger.debug('transactionObject', transactionObject)

    return {
      status: TransactionStatus.Unsigned,
      id: null,
      fromAddress: fromAddress,
      toAddress: toAddress,
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
      if (!options.legacySweep) {
        throw new Error(
          `Received string from param in erc20 createSweepTransaction, but legacySweep option isn't enabled.`
            + `If you're really sure you want to sweep a legacy address, enable the option, otherwise provide `
            + 'a from index number instead of an address to sweep a create2 proxy.'
        )
      }
      // deployable wallet contract
      fromAddress = this.standardizeAddressOrThrow(from)
      target = fromAddress

      const contract = this.newContract(TOKEN_WALLET_ABI_LEGACY, from)
      txData = contract.methods.sweep(this.tokenAddress, toAddress).encodeABI()
    } else {
      // create2 selfdesctructuble proxy contract
      if (!this.masterAddress) {
        throw new Error('Cannot sweep using create2 proxy contract without a masterAddress specified in config')
      }
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
        `Insufficient ${this.nativeCoinSymbol} balance (${this.toMainDenominationNative(ethBalance)}) at owner address ${signerAddress} `
        + `to sweep contract ${from} with fee of ${feeOption.feeMain} ${this.nativeCoinSymbol}`)
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
      from: signerAddress,
      to: target,
      data: txData,
      value: numericToHex(0),
      nonce: numericToHex(nonce),
      gasPrice: numericToHex(feeOption.gasPrice),
      gas: numericToHex(amountOfGas),
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
    const sequenceNumber = await this.networkData.getNextNonce(resolvedPayport.address)

    return sequenceNumber
  }

  private async getEthBaseBalance(address: string): Promise<BigNumber> {
    const balanceBase = await this._retryDced(() => this.eth.getBalance(address))

    return new BigNumber(balanceBase)
  }
}

export default BaseErc20Payments
