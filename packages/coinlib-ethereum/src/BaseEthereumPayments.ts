import { Transaction as EjsTx, TxData as EjsTxData, TxOptions as EjsTxOptions } from '@ethereumjs/tx'
import EjsCommon from '@ethereumjs/common'
import type { TransactionConfig } from 'web3-core'
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
  PayportOutput,
  AutoFeeLevels,
  DEFAULT_MAX_FEE_PERCENT,
  BigNumber,
  DerivablePayport,
} from '@bitaccess/coinlib-common'
import { isType, isMatchingError, Numeric } from '@bitaccess/ts-common'
import request from 'request-promise-native'

import {
  EthereumTransactionInfo,
  EthereumUnsignedTransaction,
  EthereumSignedTransaction,
  EthereumBroadcastResult,
  BaseEthereumPaymentsConfig,
  EthereumResolvedFeeOption,
  EthereumTransactionOptions,
  EthTxType,
  EthereumUnsignedTxData,
} from './types'
import {
  DEFAULT_FEE_LEVEL,
  ETHEREUM_TRANSFER_COST,
  TOKEN_WALLET_DATA,
  DEPOSIT_KEY_INDEX,
  TOKEN_PROXY_DATA,
} from './constants'
import { EthereumPaymentsUtils } from './EthereumPaymentsUtils'
import { buffToHex, hexToBuff, numericToHex, strip0x } from './utils'

export abstract class BaseEthereumPayments<Config extends BaseEthereumPaymentsConfig>
  extends EthereumPaymentsUtils
  implements BasePayments<
    Config, EthereumUnsignedTransaction, EthereumSignedTransaction, EthereumBroadcastResult, EthereumTransactionInfo
  > {
  private config: Config
  private ejsCommon: EjsCommon
  public depositKeyIndex: number

  constructor(config: Config) {
    super(config)
    this.config = config
    this.depositKeyIndex = (typeof config.depositKeyIndex === 'undefined') ? DEPOSIT_KEY_INDEX : config.depositKeyIndex
    const { chainId } = this.networkConstants
    this.ejsCommon = EjsCommon.isSupportedChainId(chainId as any)
      ? new EjsCommon({ chain: chainId })
      : EjsCommon.custom({ name: this.networkName, chainId, networkId: chainId })
  }

  getFullConfig(): Config {
    return this.config
  }

  abstract getPublicConfig(): Config

  async resolvePayport(payport: ResolveablePayport): Promise<Payport> {
    // NOTE: this type of nesting suggests to revise payport as an abstraction
    if (typeof payport === 'number') {
      return this.getPayport(payport)
    } else if (typeof payport === 'string') {
      return { address: this.standardizeAddressOrThrow(payport) }
    } else if (DerivablePayport.is(payport)) {
      return this.getPayport(payport.index)
    } else if (this.isValidPayport(payport)) {
      return { ...payport, address: this.standardizeAddressOrThrow(payport.address) }
    }
    throw new Error(`Invalid ${this.networkName} payport: ${JSON.stringify(payport)}`)
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
    amountOfGas: number = ETHEREUM_TRANSFER_COST,
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
    amountOfGas: number,
  ): EthereumResolvedFeeOption {
    const { feeRate, feeRateType } = feeOption

    // Determine the gas price first
    let gasPrice: BigNumber
    if (feeRateType === FeeRateType.BasePerWeight) {
      gasPrice = new BigNumber(feeRate)
    } else {
      const feeRateBase = feeRateType === FeeRateType.Main
        ? this.toBaseDenominationBigNumberNative(feeRate)
        : new BigNumber(feeRate)
      gasPrice = feeRateBase.dividedBy(amountOfGas)
    }
    gasPrice = gasPrice.dp(0, BigNumber.ROUND_DOWN) // Round down to avoid exceeding target

    // Calculate the actual total fees after gas price is rounded
    const feeBase = gasPrice.multipliedBy(amountOfGas)
    const feeMain = this.toMainDenominationBigNumberNative(feeBase)

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
    amountOfGas: number,
  ): Promise<EthereumResolvedFeeOption> {
    const gasPrice = new BigNumber(await this.networkData.getGasPrice(feeLevel))
    const feeBase = gasPrice.multipliedBy(amountOfGas).toFixed()

    return {
      targetFeeRate: gasPrice.toFixed(),
      targetFeeLevel: feeLevel,
      targetFeeRateType: FeeRateType.BasePerWeight,
      feeBase,
      feeMain: this.toMainDenominationNative(feeBase),
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

  abstract getPayport(index: number): Promise<Payport>

  abstract getPrivateKey(index: number): Promise<string>

  async getBalance(resolveablePayport: ResolveablePayport): Promise<BalanceResult> {
    const payport = await this.resolvePayport(resolveablePayport)
    return this.getAddressBalance(payport.address)
  }

  async isSweepableBalance(balance: Numeric) {
    return this.isAddressBalanceSweepable(balance)
  }

  async getNextSequenceNumber(payport: ResolveablePayport) {
    const resolvedPayport = await this.resolvePayport(payport)
    return this.getAddressNextSequenceNumber(resolvedPayport.address)
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

  async createJoinedTransaction(): Promise<null> {
    return null
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

  async createMultiInputTransaction(
    from: number[],
    to: PayportOutput[],
    options: TransactionOptions = {},
  ): Promise<null> {
    return null
  }

  async signTransaction(unsignedTx: EthereumUnsignedTransaction): Promise<EthereumSignedTransaction> {
    const fromPrivateKey = await this.getPrivateKey(unsignedTx.fromIndex!)
    const privateKeyBuffer = hexToBuff(fromPrivateKey)

    const { to, value, gas, gasPrice, nonce, data } = unsignedTx.data
    const txData: EjsTxData = {
      to,
      value,
      gasLimit: gas,
      gasPrice,
      nonce,
      data,
    }

    const tx = new EjsTx(txData, { common: this.ejsCommon })
      .sign(privateKeyBuffer)

    if (!tx.verifySignature()) {
      this.logger.log(
        'Failed to verify signTransaction signature. unsignedTx =', unsignedTx, 'tx.toJSON =', tx.toJSON())
      throw new Error('Failed to verify signTransaction signature')
    }

    const result: EthereumSignedTransaction = {
      ...unsignedTx,
      id: buffToHex(tx.hash()),
      status: TransactionStatus.Signed,
      data: {
        ...tx.toJSON(),
        hex: buffToHex(tx.serialize()),
      }
    }
    this.logger.debug('signTransaction result', result)
    return result
  }

  private sendTransactionWithoutConfirmation(txHex: string): Promise<string> {
    return this._retryDced(() => new Promise((resolve, reject) => {
      let done = false
      const errorHandler = (e: Error) => {
        if (!done) {
          done = true
          reject(e)
        }
      }
      const successHandler = (hash: string) => {
        if (!done) {
          done = true
          resolve(hash)
        }
      }
      this.eth.sendSignedTransaction(txHex)
        .on('transactionHash', successHandler)
        .on('error', errorHandler)
        .then((r) => successHandler(r.transactionHash))
        .catch(errorHandler)
    }))
  }

  async broadcastTransaction(tx: EthereumSignedTransaction): Promise<EthereumBroadcastResult> {
    if (tx.status !== TransactionStatus.Signed) {
      throw new Error(`Tx ${tx.id} has not status ${TransactionStatus.Signed}`)
    }

    try {
      if (this.config.blockbookNode) {
        const url = `${this.config.blockbookNode}/api/sendtx/${tx.data.hex}`
        request
          .get(url, { json: true })
          .then((res) => this.logger.log(`Successful secondary broadcast to blockbook ethereum ${res.result}`))
          .catch((e) =>
            this.logger.log(`Failed secondary broadcast to blockbook ethereum ${tx.id}: ${url} - ${e}`),
          )
      }
      const txId = await this.sendTransactionWithoutConfirmation(tx.data.hex)
      return {
        id: txId,
      }
    } catch (e) {
      if (isMatchingError(e, ['already known'])) {
        this.logger.log(`Ethereum broadcast tx already known ${tx.id}`)
        return {
          id: tx.id
        }
      }
      this.logger.warn(`Ethereum broadcast tx unsuccessful ${tx.id}: ${e.message}`)
      if (isMatchingError(e, ['nonce too low'])) {
        throw new PaymentsError(PaymentsErrorCode.TxSequenceCollision, e.message)
      }
      throw new Error(`Ethereum broadcast tx unsuccessful: ${tx.id} ${e.message}`)
    }
  }

  /** Helper for determining what gas limit should be used when creating tx. Prefer provided option over estimate. */
  protected async gasOptionOrEstimate(
    options: EthereumTransactionOptions,
    txObject: TransactionConfig,
    txType: EthTxType,
  ): Promise<number> {
    if (options.gas) {
      return new BigNumber(options.gas).dp(0, BigNumber.ROUND_UP).toNumber()
    }
    return this.networkData.estimateGas(txObject, txType)
  }

  private async createTransactionObject(
    from: number,
    to: ResolveablePayport | undefined,
    amountNative: string,
    options: EthereumTransactionOptions = {}
  ): Promise<EthereumUnsignedTransaction> {
    const serviceFlag = (amountNative === '' && typeof to === 'undefined')
    const sweepFlag = amountNative === 'max'
    const txType = serviceFlag ? 'CONTRACT_DEPLOY' : 'ETHEREUM_TRANSFER'

    const fromPayport = await this.getPayport(from)
    const toPayport = serviceFlag ? { address: '' } : await this.resolvePayport(to as ResolveablePayport)
    const toIndex = typeof to === 'number' ? to : null

    const txConfig: Pick<EthereumUnsignedTxData, 'from' | 'to' | 'data'> = {
      from: fromPayport.address,
    }
    if (serviceFlag) {
      if (options.data) {
        txConfig.data = options.data
      } else if (options.proxyAddress) {
        txConfig.data = TOKEN_PROXY_DATA
          .replace(/<address to proxy>/g, strip0x(options.proxyAddress).toLowerCase())
      } else {
        txConfig.data = TOKEN_WALLET_DATA
      }
    }

    if (toPayport.address) {
      txConfig.to = toPayport.address
    }

    const amountOfGas = await this.gasOptionOrEstimate(options, txConfig, txType)
    const feeOption = await this.resolveFeeOption(options, amountOfGas)

    const { confirmedBalance: balanceNative } = await this.getBalance(fromPayport)
    const nonce = options.sequenceNumber || await this.getNextSequenceNumber(fromPayport.address)

    const { feeMain, feeBase } = feeOption
    const feeWei = new BigNumber(feeBase)
    const maxFeePercent = new BigNumber(options.maxFeePercent ?? DEFAULT_MAX_FEE_PERCENT)
    const balanceWei = this.toBaseDenominationBigNumberNative(balanceNative)
    let amountWei: BigNumber = new BigNumber(0)

    if (balanceWei.eq(0)) {
      throw new PaymentsError(
        PaymentsErrorCode.TxInsufficientBalance,
        `${fromPayport.address} No balance available (${balanceNative})`,
      )
    }

    if (sweepFlag) {
      amountWei = balanceWei.minus(feeWei)
      if (balanceWei.isLessThan(feeWei)) {
        throw new PaymentsError(
          PaymentsErrorCode.TxFeeTooHigh,
          `${fromPayport.address} Insufficient balance (${balanceNative}) to pay sweep fee of ${feeMain}`,
        )
      }
      if (feeWei.gt(maxFeePercent.times(balanceWei))) {
        throw new PaymentsError(
          PaymentsErrorCode.TxFeeTooHigh,
          `${fromPayport.address} Sweep fee (${feeMain}) exceeds max fee percent (${maxFeePercent}%) of address balance (${balanceNative})`,
        )
      }
    } else if (!sweepFlag && !serviceFlag){
      amountWei = this.toBaseDenominationBigNumberNative(amountNative)
      if (amountWei.plus(feeWei).isGreaterThan(balanceWei)) {
        throw new PaymentsError(
          PaymentsErrorCode.TxInsufficientBalance,
          `${fromPayport.address} Insufficient balance (${balanceNative}) to send ${amountNative} including fee of ${feeOption.feeMain}`,
        )
      }
      if (feeWei.gt(maxFeePercent.times(amountWei))) {
        throw new PaymentsError(
          PaymentsErrorCode.TxFeeTooHigh,
          `${fromPayport.address} Sweep fee (${feeMain}) exceeds max fee percent (${maxFeePercent}%) of send amount (${amountNative})`,
        )
      }
    } else {
      if (balanceWei.isLessThan(feeWei)) {
        throw new PaymentsError(
          PaymentsErrorCode.TxFeeTooHigh,
          `${fromPayport.address} Insufficient balance (${balanceNative}) to pay contract deploy fee of ${feeOption.feeMain}`,
        )
      }
    }

    const txData: EthereumUnsignedTxData = {
      ...txConfig,
      value: numericToHex(amountWei),
      gas: numericToHex(amountOfGas),
      gasPrice: numericToHex(feeOption.gasPrice),
      nonce: numericToHex(nonce),
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
      weight: amountOfGas,
      sequenceNumber: nonce.toString(),
      data: txData,
    }
    this.logger.debug('createTransactionObject result', result)
    return result
  }
}

export default BaseEthereumPayments
