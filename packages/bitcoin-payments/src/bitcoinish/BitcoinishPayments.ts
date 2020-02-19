import {
  BasePayments, UtxoInfo, FeeOptionCustom, FeeRateType, FeeRate, FeeOption,
  ResolvedFeeOption, FeeLevel, AutoFeeLevels, Payport, ResolveablePayport,
  BalanceResult, FromTo, TransactionStatus, CreateTransactionOptions, BaseConfig,
  WeightedChangeOutput,
} from '@faast/payments-common'
import { isUndefined, isType, Numeric, toBigNumber } from '@faast/ts-common'
import BigNumber from 'bignumber.js'
import { get } from 'lodash'

import {
  BitcoinishUnsignedTransaction,
  BitcoinishSignedTransaction,
  BitcoinishBroadcastResult,
  BitcoinishTransactionInfo,
  BitcoinishPaymentsConfig,
  BitcoinishPaymentTx,
  BitcoinishTxOutput,
  BitcoinishWeightedChangeOutput,
} from './types'
import { sortUtxos, estimateTxFee } from './utils'
import { BitcoinishPaymentsUtils } from './BitcoinishPaymentsUtils'

export abstract class BitcoinishPayments<Config extends BaseConfig> extends BitcoinishPaymentsUtils
  implements BasePayments<
    Config,
    BitcoinishUnsignedTransaction,
    BitcoinishSignedTransaction,
    BitcoinishBroadcastResult,
    BitcoinishTransactionInfo
  > {
  coinSymbol: string
  coinName: string
  minTxFee?: FeeRate
  dustThreshold: number
  networkMinRelayFee: number
  isSegwit: boolean
  defaultFeeLevel: AutoFeeLevels

  constructor(config: BitcoinishPaymentsConfig) {
    super(config)
    this.coinSymbol = config.coinSymbol
    this.coinName = config.coinName
    this.decimals = config.decimals
    this.bitcoinjsNetwork = config.bitcoinjsNetwork
    this.minTxFee = config.minTxFee
    this.dustThreshold = config.dustThreshold
    this.networkMinRelayFee = config.networkMinRelayFee
    this.isSegwit = config.isSegwit
    this.defaultFeeLevel = config.defaultFeeLevel
  }

  abstract getFullConfig(): Config
  abstract getPublicConfig(): Config
  abstract getAccountId(index: number): string
  abstract getAccountIds(): string[]
  abstract getAddress(index: number): string
  abstract getFeeRateRecommendation(feeLevel: AutoFeeLevels): Promise<FeeRate>
  abstract isValidAddress(address: string): Promise<boolean>
  abstract signTransaction(tx: BitcoinishUnsignedTransaction): Promise<BitcoinishSignedTransaction>

  async init() {}
  async destroy() {}

  requiresBalanceMonitor() {
    return false
  }

  isSweepableBalance(balance: Numeric): boolean {
    return this.toBaseDenominationNumber(balance) > this.networkMinRelayFee
  }

  async getPayport(index: number): Promise<Payport> {
    return { address: this.getAddress(index) }
  }

  async resolvePayport(payport: ResolveablePayport): Promise<Payport> {
    if (typeof payport === 'number') {
      return this.getPayport(payport)
    } else if (typeof payport === 'string') {
      if (!await this.isValidAddress(payport)) {
        throw new Error(`Invalid BTC address: ${payport}`)
      }
      return { address: payport }
    } else if (Payport.is(payport)) {
      if (!await this.isValidAddress(payport.address)) {
        throw new Error(`Invalid BTC payport.address: ${payport.address}`)
      }
      return payport
    } else {
      throw new Error('Invalid payport')
    }
  }

  _feeRateToSatoshis(
    { feeRate, feeRateType }: FeeRate,
    inputCount: number,
    outputCount: number,
  ): number {
    if (feeRateType === FeeRateType.BasePerWeight) {
      return estimateTxFee(Number.parseFloat(feeRate), inputCount, outputCount, this.isSegwit)
    } else if (feeRateType === FeeRateType.Main) {
      return this.toBaseDenominationNumber(feeRate)
    }
    return Number.parseFloat(feeRate)
  }

  _calculatTxFeeSatoshis(
    targetRate: FeeRate,
    inputCount: number,
    outputCount: number,
  ) {
    let feeSat = this._feeRateToSatoshis(targetRate, inputCount, outputCount)
    // Ensure calculated fee is above network minimum
    if (this.minTxFee) {
      const minTxFeeSat = this._feeRateToSatoshis(this.minTxFee, inputCount, outputCount)
      if (feeSat < minTxFeeSat) {
        feeSat = minTxFeeSat
      }
    }
    if (feeSat < this.networkMinRelayFee) {
      feeSat = this.networkMinRelayFee
    }
    return Math.ceil(feeSat)
  }

  async resolveFeeOption(
    feeOption: FeeOption,
  ): Promise<ResolvedFeeOption> {
    let targetLevel: FeeLevel
    let target: FeeRate
    let feeBase = ''
    let feeMain = ''
    if (isType(FeeOptionCustom, feeOption)) {
      targetLevel = FeeLevel.Custom
      target = feeOption
    } else {
      targetLevel = feeOption.feeLevel || this.defaultFeeLevel
      target = await this.getFeeRateRecommendation(targetLevel)
    }
    if (target.feeRateType === FeeRateType.Base) {
      feeBase = target.feeRate
      feeMain = this.toMainDenominationString(feeBase)
    } else if (target.feeRateType === FeeRateType.Main) {
      feeMain = target.feeRate
      feeBase = this.toBaseDenominationString(feeMain)
    }
    // in base/weight case total fees depend on input/output count, so just leave them as empty strings
    return {
      targetFeeLevel: targetLevel,
      targetFeeRate: target.feeRate,
      targetFeeRateType: target.feeRateType,
      feeBase,
      feeMain,
    }
  }

  async getBalance(payport: ResolveablePayport): Promise<BalanceResult> {
    const { address } = await this.resolvePayport(payport)
    const result = await this._retryDced(() => this.getApi().getAddressDetails(address, { details: 'basic' }))
    const confirmedBalance = this.toMainDenominationString(result.balance)
    const unconfirmedBalance = this.toMainDenominationString(result.unconfirmedBalance)
    this.logger.debug('getBalance', address, confirmedBalance, unconfirmedBalance)
    return {
      confirmedBalance,
      unconfirmedBalance,
      sweepable: this.isSweepableBalance(confirmedBalance)
    }
  }

  usesUtxos() {
    return true
  }

  async getUtxos(payport: ResolveablePayport): Promise<UtxoInfo[]> {
    const { address } = await this.resolvePayport(payport)
    let utxosRaw = await this.getApi().getUtxosForAddress(address)
    const utxos: UtxoInfo[] = utxosRaw.map((data) => {
      const { value, height, lockTime } = data
      return {
        ...data,
        satoshis: value,
        value: this.toMainDenominationString(value),
        height: isUndefined(height) ? undefined : String(height),
        lockTime: isUndefined(lockTime) ? undefined : String(lockTime),
      }
    })
    return utxos
  }

  /**
   * Sum the utxos values (main denomination)
   */
  _sumUtxoValue(utxos: UtxoInfo[]): BigNumber {
    return utxos.reduce((total, { value }) => toBigNumber(value).plus(total), new BigNumber(0))
  }

  usesSequenceNumber() {
    return false
  }

  async getNextSequenceNumber() {
    return null
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

  /** buildPaymentTx uses satoshi number for convenient math, but we want strings externally */
  private convertOutputsToExternalFormat(outputs: Array<{ address: string, satoshis: number }>): BitcoinishTxOutput[] {
    return outputs.map(({ address, satoshis }) => ({ address, value: this.toMainDenominationString(satoshis) }))
  }

  /**
   * Build a simple payment transaction.
   * Note: fee will be subtracted from first output when attempting to send entire account balance
   * Note: All amounts/values should be input and output as main denomination strings for consistent
   * serialization. Within this function they're converted to JS Numbers for convenient arithmetic
   * then converted back to strings before being returned.
   */
  async buildPaymentTx(
    allUtxos: UtxoInfo[],
    desiredOutputs: BitcoinishTxOutput[],
    changeOutputWeights: BitcoinishWeightedChangeOutput[],
    desiredFeeRate: FeeRate,
    useAllUtxos: boolean = false,
  ): Promise<BitcoinishPaymentTx> {
    // The maximum # of outputs this tx will have. It could have less if some change outputs are dropped
    // for being too small.
    const maxOutputCount = desiredOutputs.length + changeOutputWeights.length
    let outputTotal = 0 // sum of non change output value in satoshis
    const externalOutputs = desiredOutputs.map(({ address, value }) => ({
      address,
      satoshis: this.toBaseDenominationNumber(value),
    }))
    for (let i = 0; i < externalOutputs.length; i++) {
      const { address, satoshis } = externalOutputs[i]
      // validate
      if (!await this.isValidAddress(address)) {
        throw new Error(`Invalid ${this.coinSymbol} address ${address} provided for output ${i}`)
      }
      if (satoshis <= 0) {
        throw new Error(`Invalid ${this.coinSymbol} amount ${satoshis} provided for output ${i}`)
      }
      outputTotal += satoshis
    }

    /* Select inputs and calculate appropriate fee */
    let inputUtxos = []
    let inputTotal = 0
    let feeSat = 0 // Total fee is recalculated when adding each input
    let amountWithFee = outputTotal + feeSat
    if (useAllUtxos) {
      inputUtxos = allUtxos
      inputTotal = this.toBaseDenominationNumber(this._sumUtxoValue(allUtxos))
      feeSat = this._calculatTxFeeSatoshis(desiredFeeRate, inputUtxos.length, maxOutputCount)
      amountWithFee = outputTotal + feeSat
    } else {
      const sortedUtxos = sortUtxos(allUtxos)
      for (const utxo of sortedUtxos) {
        inputUtxos.push(utxo)
        inputTotal = inputTotal + this.toBaseDenominationNumber(utxo.value)
        feeSat = this._calculatTxFeeSatoshis(desiredFeeRate, inputUtxos.length, maxOutputCount)
        amountWithFee = outputTotal + feeSat
        if (inputTotal >= amountWithFee) {
          break
        }
      }
    }
    if (amountWithFee > inputTotal) {
      const amountWithSymbol = `${this.toMainDenominationString(outputTotal)} ${this.coinSymbol}`
      if (outputTotal === inputTotal) {
        // Share the fee across all outputs. This may increase the fee by as much as 1 sat per output, negligible
        const feeShare = Math.ceil(feeSat / externalOutputs.length)
        feeSat = feeShare * externalOutputs.length
        this.logger.log(
          `Attempting to send entire ${amountWithSymbol} balance. ` +
          `Subtracting fee of ${feeSat} sat from ${externalOutputs.length} outputs (${feeShare} sat each)`
        )
        amountWithFee = inputTotal
        for (let i = 0; i < externalOutputs.length; i++) {
          const externalOutput = externalOutputs[i]
          externalOutput.satoshis -= feeShare
          if (externalOutput.satoshis <= this.dustThreshold) {
            throw new Error(`${this.coinSymbol} output ${i} for ${externalOutput.satoshis} sat minus ${feeShare} sat fee share is below dust threshold`)
          }
        }
        outputTotal -= feeSat
      } else {
        const { feeRate, feeRateType } = desiredFeeRate
        const feeText = `${feeRate} ${feeRateType}${feeRateType === FeeRateType.BasePerWeight ? ` (${this.toMainDenominationString(feeSat)})` : ''}`
        throw new Error(`You do not have enough UTXOs (${this.toMainDenominationString(inputTotal)}) to send ${amountWithSymbol} with ${feeText} fee`)
      }
    }

    let totalChangeSat = inputTotal - amountWithFee
    let changeOutputs: Array<{ address: string, satoshis: number}> = []
    if (totalChangeSat > this.dustThreshold) { // Avoid creating dust outputs
      if (changeOutputWeights.length === 0) {
        throw new Error(`${this.coinSymbol} buildPaymentTx - transaction has change of ${totalChangeSat} sat but change outputs not provided`)
      }
      const totalChangeWeight = changeOutputWeights.reduce((total, { weight }) => total += weight, 0)
      let totalChangeAllocated = 0 // Total of all change outputs we actually include (omitting dust)
      for (let i = 0; i < changeOutputWeights.length; i++) {
        const { address, weight } = changeOutputWeights[i]
        // Distribute change proportional to each change outputs weight. Floored to not exceed inputTotal
        const changeSat = Math.floor(totalChangeSat * (weight / totalChangeWeight))
        if (changeSat <= this.dustThreshold) {
          this.logger.log(
            `${this.coinSymbol} buildPaymentTx - desired change output ${i} is below dust threshold, will redistribute to other outputs or add to fee`
          )
        } else {
          changeOutputs.push({ address, satoshis: changeSat })
          totalChangeAllocated = changeSat
        }
      }
      // If due to rounding or omitting dust outputs our real change total is different, adjust fees accordingly
      let looseChange = totalChangeSat - totalChangeAllocated
      if (looseChange < 0) {
        throw new Error(`${this.coinSymbol} buildPaymentTx - looseChange should never be negative!`)
      } else if (changeOutputs.length > 0 && looseChange / changeOutputs.length > 1) {
        const extraSatPerChangeOutput = Math.floor(looseChange / changeOutputs.length)
        this.logger.log(`${this.coinSymbol} buildPaymentTx - redistributing looseChange of ${extraSatPerChangeOutput} per change output`)
        for (let i = 0; i < changeOutputs.length; i++) {
          changeOutputs[i].satoshis += extraSatPerChangeOutput
        }
        looseChange -= extraSatPerChangeOutput * changeOutputs.length
      }
      feeSat += looseChange
      totalChangeSat -= looseChange
    } else if (totalChangeSat > 0) {
      this.logger.log(
        `${this.coinSymbol} buildPaymentTx - change of ${totalChangeSat} sat is below dustThreshold of ${this.dustThreshold}, adding to fee`
      )
      feeSat += totalChangeSat
      totalChangeSat = 0
    } else {
      throw new Error(`${this.coinSymbol} buildPaymentTx - totalChangeSat is negative when building tx, this shouldnt happen!`)
    }
    const externalOutputsResult = this.convertOutputsToExternalFormat(externalOutputs)
    const changeOutputsResult = this.convertOutputsToExternalFormat(changeOutputs)
    return {
      inputs: inputUtxos,
      outputs: [...externalOutputsResult, ...changeOutputsResult],
      fee: this.toMainDenominationString(feeSat),
      change: this.toMainDenominationString(totalChangeSat),
      changeAddress: changeOutputs.length === 1 ? changeOutputs[0].address : null,
      changeOutputs: changeOutputsResult,
      externalOutputs: externalOutputsResult,
    }
  }

  async resolveWeightedChangeOutputs(
    changeOutputs: WeightedChangeOutput[],
  ): Promise<BitcoinishWeightedChangeOutput[]> {
    return Promise.all(changeOutputs.map(async ({ payport, weight }, i) => {
      try {
        const { address } = await this.resolvePayport(payport)
        return {
          address,
          weight: isUndefined(weight) ? 1 : weight,
        }
      } catch (e) {
        throw new Error(`Cannot resolve payport of changeOutput[${i}] - ${e.message}`)
      }
    }))
  }

  async createTransaction(
    from: number,
    to: ResolveablePayport,
    amountNumeric: Numeric,
    options: CreateTransactionOptions = {},
  ): Promise<BitcoinishUnsignedTransaction> {
    this.logger.debug('createTransaction', from, to, amountNumeric)
    const desiredAmount = toBigNumber(amountNumeric)
    if (desiredAmount.isNaN() || desiredAmount.lte(0)) {
      throw new Error(`Invalid ${this.coinSymbol} amount provided to createTransaction: ${desiredAmount}`)
    }
    const {
      fromIndex, fromAddress, fromExtraId, toIndex, toAddress, toExtraId,
    } = await this.resolveFromTo(from, to)

    const allUtxos = isUndefined(options.utxos)
      ? await this.getUtxos(from)
      : options.utxos
      this.logger.debug('createTransaction allUtxos', allUtxos)

    const { targetFeeLevel, targetFeeRate, targetFeeRateType } = await this.resolveFeeOption(options)
    this.logger.debug(`createTransaction resolvedFeeOption ${targetFeeLevel} ${targetFeeRate} ${targetFeeRateType}`)

    const changeOutputs = options.changeOutputs
      ? await this.resolveWeightedChangeOutputs(options.changeOutputs)
      : [{ address: fromAddress, weight: 1 }]
    const paymentTx = await this.buildPaymentTx(
      allUtxos,
      [{ address: toAddress, value: desiredAmount.toString() }],
      changeOutputs,
      { feeRate: targetFeeRate, feeRateType: targetFeeRateType },
      options.useAllUtxos,
    )
    this.logger.debug('createTransaction data', paymentTx)
    const feeMain = paymentTx.fee

    const actualAmount = paymentTx.outputs[0].value

    return {
      status: TransactionStatus.Unsigned,
      id: null,
      fromIndex,
      fromAddress,
      fromExtraId,
      toIndex,
      toAddress,
      toExtraId,
      amount: actualAmount,
      targetFeeLevel,
      targetFeeRate,
      targetFeeRateType,
      fee: feeMain,
      sequenceNumber: null,
      inputUtxos: paymentTx.inputs,
      data: paymentTx,
    }
  }

  async createSweepTransaction(
    from: number,
    to: ResolveablePayport,
    options: CreateTransactionOptions = {},
  ): Promise<BitcoinishUnsignedTransaction> {
    this.logger.debug('createSweepTransaction', from, to, options)
    const allUtxos = isUndefined(options.utxos)
      ? await this.getUtxos(from)
      : options.utxos
    if (allUtxos.length === 0) {
      throw new Error('No utxos to sweep')
    }
    const amount = this._sumUtxoValue(allUtxos)
    if (!this.isSweepableBalance(amount)) {
      throw new Error(`Balance ${amount} too low to sweep`)
    }
    return this.createTransaction(from, to, amount, {
      ...options,
      utxos: allUtxos,
      useAllUtxos: true,
    })
  }

  async broadcastTransaction(tx: BitcoinishSignedTransaction): Promise<BitcoinishBroadcastResult> {
    const txId = await this._retryDced(() => this.getApi().sendTx(tx.data.hex))
    if (tx.id !== txId) {
      this.logger.warn(`Broadcasted ${this.coinSymbol} txid ${txId} doesn't match original txid ${tx.id}`)
    }
    return {
      id: txId,
    }
  }

  async getTransactionInfo(txId: string): Promise<BitcoinishTransactionInfo> {
    const tx = await this._retryDced(() => this.getApi().getTx(txId))
    const fee = this.toMainDenominationString(tx.fees)
    const confirmationId = tx.blockHash || null
    const confirmationNumber = tx.blockHeight ? String(tx.blockHeight) : undefined
    const confirmationTimestamp = tx.blockTime ? new Date(tx.blockTime * 1000) : null
    const isConfirmed = Boolean(confirmationNumber)
    const status = isConfirmed ? TransactionStatus.Confirmed : TransactionStatus.Pending
    const amountSat = get(tx, 'vout.0.value', tx.value)
    const amount = this.toMainDenominationString(amountSat)
    const fromAddress = get(tx, 'vin.0.addresses.0')
    if (!fromAddress) {
      throw new Error(`Unable to determine fromAddress of ${this.coinSymbol} tx ${txId}`)
    }
    const toAddress = get(tx, 'vout.0.addresses.0')
    if (!toAddress) {
      throw new Error(`Unable to determine toAddress of ${this.coinSymbol} tx ${txId}`)
    }

    return {
      status,
      id: tx.txid,
      fromIndex: null,
      fromAddress,
      fromExtraId: null,
      toIndex: null,
      toAddress,
      toExtraId: null,
      amount,
      fee,
      sequenceNumber: null,
      confirmationId,
      confirmationNumber,
      confirmationTimestamp,
      isExecuted: isConfirmed,
      isConfirmed,
      confirmations: tx.confirmations,
      data: tx,
    }
  }
}
