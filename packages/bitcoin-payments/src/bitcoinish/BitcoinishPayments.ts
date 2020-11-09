import {
  BasePayments,
  UtxoInfo,
  FeeOptionCustom,
  FeeRateType,
  FeeRate,
  FeeOption,
  ResolvedFeeOption,
  FeeLevel,
  AutoFeeLevels,
  Payport,
  ResolveablePayport,
  BalanceResult,
  FromTo,
  TransactionStatus,
  CreateTransactionOptions,
  BaseConfig,
  MaybePromise,
  PayportOutput,
  TransactionOutput,
} from '@faast/payments-common'
import { isUndefined, isType, Numeric, toBigNumber, assertType, isNumber } from '@faast/ts-common'
import { get } from 'lodash'
import * as t from 'io-ts'

import {
  BitcoinishUnsignedTransaction,
  BitcoinishSignedTransaction,
  BitcoinishBroadcastResult,
  BitcoinishTransactionInfo,
  BitcoinishPaymentsConfig,
  BitcoinishPaymentTx,
  BitcoinishTxOutput,
  BitcoinishTxOutputSatoshis,
  BitcoinishWeightedChangeOutput,
  BitcoinishTxBuildContext,
  BitcoinishBuildPaymentTxParams,
} from './types'
import { sumUtxoValue, shuffleUtxos, isConfirmedUtxo, sha256FromHex } from './utils'
import { BitcoinishPaymentsUtils } from './BitcoinishPaymentsUtils'
import BigNumber from 'bignumber.js'

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
  dustThreshold: number // base denom
  networkMinRelayFee: number // base denom
  defaultFeeLevel: AutoFeeLevels
  targetUtxoPoolSize: number
  minChangeSat: number

  constructor(config: BitcoinishPaymentsConfig) {
    super(config)
    this.coinSymbol = config.coinSymbol
    this.coinName = config.coinName
    this.decimals = config.decimals
    this.bitcoinjsNetwork = config.bitcoinjsNetwork
    this.minTxFee = config.minTxFee
    this.dustThreshold = config.dustThreshold
    this.networkMinRelayFee = config.networkMinRelayFee
    this.defaultFeeLevel = config.defaultFeeLevel
    this.targetUtxoPoolSize = isUndefined(config.targetUtxoPoolSize) ? 1 : config.targetUtxoPoolSize
    const minChange = toBigNumber(isUndefined(config.minChange) ? 0 : config.minChange)
    if (minChange.lt(0)) {
      throw new Error(`invalid minChange amount ${config.minChange}, must be positive`)
    }
    this.minChangeSat = this.toBaseDenominationNumber(minChange)
  }

  abstract getFullConfig(): Config
  abstract getPublicConfig(): Config
  abstract getAccountId(index: number): string
  abstract getAccountIds(index?: number): string[]
  abstract getAddress(index: number): string
  abstract getFeeRateRecommendation(feeLevel: AutoFeeLevels): Promise<FeeRate>
  abstract isValidAddress(address: string): MaybePromise<boolean>
  abstract signTransaction(tx: BitcoinishUnsignedTransaction): Promise<BitcoinishSignedTransaction>

  /**
   * Serialize the payment tx into an hex string format representing the unsigned transaction.
   *
   * By default return empty string because it's coin dependent. Implementors can override this
   * with coin specific implementation (eg using Psbt for bitcoin). If coin doesn't have an unsigned
   * serialized tx format (ie most coins other than BTC) then leave as empty string.
   */
  abstract serializePaymentTx(paymentTx: BitcoinishPaymentTx, fromIndex: number): Promise<string>

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
    const confirmedBalance = this.toMainDenominationBigNumber(result.balance)
    const unconfirmedBalance = this.toMainDenominationBigNumber(result.unconfirmedBalance)
    const spendableBalance = confirmedBalance.plus(unconfirmedBalance)
    this.logger.debug('getBalance', address, confirmedBalance, unconfirmedBalance)
    return {
      confirmedBalance: confirmedBalance.toString(),
      unconfirmedBalance: unconfirmedBalance.toString(),
      spendableBalance: spendableBalance.toString(),
      sweepable: this.isSweepableBalance(spendableBalance),
      requiresActivation: false,
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
        satoshis: Number.parseInt(value),
        value: this.toMainDenominationString(value),
        height: isUndefined(height) ? undefined : String(height),
        lockTime: isUndefined(lockTime) ? undefined : String(lockTime),
      }
    })
    return utxos
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
   * Estimate the size of a tx in vbytes. Override this if the coin supports segwit, multisig, or any
   * non P2PKH style transaction. Default implementation assumes P2PKH.
   */
  estimateTxSize(
    inputCount: number,
    changeOutputCount: number,
    externalOutputAddresses: string[],
  ): number {
    return 10 + 148 * inputCount + 34 * (changeOutputCount + externalOutputAddresses.length)
  }

  /** Helper for calculateTxFeeSatoshis */
  private feeRateToSatoshis(
    { feeRate, feeRateType }: FeeRate,
    inputCount: number,
    changeOutputCount: number,
    externalOutputAddresses: string[],
  ): number {
    if (feeRateType === FeeRateType.BasePerWeight) {
      const estimatedTxSize = this.estimateTxSize(inputCount, changeOutputCount, externalOutputAddresses)
      this.logger.debug(`${this.coinSymbol} buildPaymentTx - `
        + `Estimated tx size of ${estimatedTxSize} vbytes for a tx with ${inputCount} inputs, `
        + `${externalOutputAddresses.length} external outputs, and ${changeOutputCount} change outputs`
      )
      return Number.parseFloat(feeRate) * estimatedTxSize
    } else if (feeRateType === FeeRateType.Main) {
      return this.toBaseDenominationNumber(feeRate)
    }
    return Number.parseFloat(feeRate)
  }

  /** Estimate the tx fee in satoshis */
  private estimateTxFee(
    targetRate: FeeRate,
    inputCount: number,
    changeOutputCount: number,
    externalOutputAddresses: string[],
  ): number {
    let feeSat = this.feeRateToSatoshis(targetRate, inputCount, changeOutputCount, externalOutputAddresses)
    // Ensure calculated fee is above configured minimum
    if (this.minTxFee) {
      const minTxFeeSat = this.feeRateToSatoshis(this.minTxFee, inputCount, changeOutputCount, externalOutputAddresses)
      if (feeSat < minTxFeeSat) {
        this.logger.debug(`Using min tx fee of ${minTxFeeSat} sat (${this.minTxFee} sat/byte) instead of ${feeSat} sat`)
        feeSat = minTxFeeSat
      }
    }
    // Ensure calculated fee is above network relay minimum
    if (feeSat < this.networkMinRelayFee) {
      this.logger.debug(`Using network min relay fee of ${this.networkMinRelayFee} sat instead of ${feeSat} sat`)
      feeSat = this.networkMinRelayFee
    }
    const result = Math.ceil(feeSat)
    this.logger.debug(`${this.coinSymbol} buildPaymentTx - `
      + `Estimated fee of ${result} sat for target rate ${targetRate.feeRate} ${targetRate.feeRateType} for a tx with `
      + `${inputCount} inputs, ${externalOutputAddresses.length} external outputs, and ${changeOutputCount} change outputs`
    )
    return result
  }

  /**
   * Determine how many change outputs to add to a transaction given how many there are currently
   * and how many we intend to use. The goal is to keep at least `targetUtxoPoolSize` utxos available
   * at all times to increase availability.
   */
  private determineTargetChangeOutputCount(unusedUtxoCount: number, inputUtxoCount: number) {
    const remainingUtxoCount = unusedUtxoCount - inputUtxoCount
    return remainingUtxoCount < this.targetUtxoPoolSize
      ? this.targetUtxoPoolSize - remainingUtxoCount
      : 1
  }

  /** Adjust all the output amounts such that externalOutputTotal equals newOutputTotal (+/- a few satoshis less) */
  private adjustOutputAmounts(tbc: BitcoinishTxBuildContext, newOutputTotal: number, description: string): void {
    // positive change -> increase outputs
    // negative change -> decrease outputs
    let totalChange = newOutputTotal - tbc.externalOutputTotal
    // Share the adjustment across all outputs. This may be an extra 1 less sat per output, negligible
    const outputCount = tbc.externalOutputs.length
    const amountChangePerOutput = Math.floor(totalChange / outputCount)
    totalChange = amountChangePerOutput * outputCount
    this.logger.log(
      `${this.coinSymbol} buildPaymentTx - Adjusting external outputs by ${totalChange} sat from ${outputCount} `
      + `outputs (${amountChangePerOutput} sat each) for ${description}`
    )
    for (let i = 0; i < outputCount; i++) {
      const externalOutput = tbc.externalOutputs[i]
      // Explicitly check value before subtracting for an accurate error message
      if (externalOutput.satoshis + amountChangePerOutput <= this.dustThreshold) {
        const errorMessage = `${this.coinSymbol} buildPaymentTx - output ${i} for ${externalOutput.satoshis} sat `
          + `after ${description} of ${amountChangePerOutput} sat is too small to send`

        if (externalOutput.satoshis + amountChangePerOutput <= 0) {
          throw new Error(errorMessage)
        }

        throw new Error(
          `${errorMessage} (below dust threshold of ${this.dustThreshold} sat)`
        )
      }
      externalOutput.satoshis += amountChangePerOutput
    }
    tbc.externalOutputTotal += totalChange
  }

  private adjustTxFee(tbc: BitcoinishTxBuildContext, newFeeSat: number): void {
    let feeSatAdjustment = newFeeSat - tbc.feeSat
    if (!tbc.recipientPaysFee && !tbc.isSweep) {
      this.applyFeeAdjustment(tbc, feeSatAdjustment)
      return
    }
    this.adjustOutputAmounts(tbc, tbc.externalOutputTotal - feeSatAdjustment, 'fee adjustment')
    this.applyFeeAdjustment(tbc, feeSatAdjustment)
  }

  private applyFeeAdjustment(tbc: BitcoinishTxBuildContext, feeSatAdjustment: number): void {
    const feeBefore = tbc.feeSat
    tbc.feeSat += feeSatAdjustment
    this.logger.debug(`${this.coinSymbol} buildPaymentTx - Adjusted fee from ${feeBefore} sat to ${tbc.feeSat} sat`)
    return
  }

  /* Select inputs, calculate appropriate fee, set fee, adjust output amounts if necessary */
  private selectInputUtxos(tbc: BitcoinishTxBuildContext): void {
    if (tbc.useAllUtxos) { // Sweeping or consolidation case
      this.selectInputUtxosForAll(tbc)
    } else { // Sending amount case
      this.selectInputUtxosPartial(tbc)
    }

    // insufficient utxos
    if (tbc.externalOutputTotal + tbc.feeSat > tbc.inputTotal) {
      throw new Error(
        `${this.coinSymbol} buildPaymentTx - You do not have enough UTXOs (${tbc.inputTotal} sat) ` +
        `to send ${tbc.externalOutputTotal} sat with ${tbc.feeSat} sat fee`
      )
    }
  }

  private selectInputUtxosForAll(tbc: BitcoinishTxBuildContext) {
    for (const utxo of tbc.unusedUtxos) {
      tbc.inputTotal += utxo.satoshis as number
      tbc.inputUtxos.push(utxo)
    }
    if (tbc.isSweep && tbc.inputTotal !== tbc.externalOutputTotal) {
      // Some dust inputs were filtered
      this.adjustOutputAmounts(tbc, tbc.inputTotal, 'sweep input adjustment')
    }
    const feeSat = this.estimateTxFee(tbc.desiredFeeRate, tbc.inputUtxos.length, 0, tbc.externalOutputAddresses)
    this.adjustTxFee(tbc, feeSat)
  }

  private selectInputUtxosPartial(tbc: BitcoinishTxBuildContext) {
    for (const utxo of tbc.enforcedUtxos) {
      tbc.inputTotal += utxo.satoshis as number
      tbc.inputUtxos.push(utxo)
    }

    if (tbc.enforcedUtxos && tbc.enforcedUtxos.length > 0) {
      return this.selectWithForcedUtxos(tbc)
    } else {
      return this.selectWithoutForcedUtxos(tbc)
    }
  }

  private selectWithForcedUtxos(tbc: BitcoinishTxBuildContext) {
    const targetChangeOutputCount = this.determineTargetChangeOutputCount(tbc.unusedUtxoCount, 0)

    const idealSolutionFeeSat = this.estimateTxFee(
      tbc.desiredFeeRate,
      tbc.inputUtxos.length,
      targetChangeOutputCount,
      tbc.externalOutputAddresses
    )
    const idealSolutionMinSat = tbc.desiredOutputTotal + (tbc.recipientPaysFee ? 0 : idealSolutionFeeSat)
    const idealSolutionMaxSat = idealSolutionMinSat + this.dustThreshold

    let selectedTotalSat = tbc.inputUtxos.reduce((total, { satoshis }) => total.plus(satoshis || 0), new BigNumber(0))

    const feeSat = this.estimateTxFee(
      tbc.desiredFeeRate, // base per weight
      tbc.inputUtxos.length,
      targetChangeOutputCount,
      tbc.externalOutputAddresses,
    )
    const neededSat = tbc.externalOutputTotal + (tbc.recipientPaysFee ? 0 : feeSat)

    if (selectedTotalSat.gte(neededSat)) {
      this.adjustTxFee(tbc, idealSolutionFeeSat)
      return
    } else {
      this.selectFromAvailableUtxos(tbc, idealSolutionMinSat, idealSolutionMaxSat, idealSolutionFeeSat)
    }
  }

  private selectWithoutForcedUtxos(tbc: BitcoinishTxBuildContext) {
    // First try to find a single input that covers output without creating change
    const idealSolutionFeeSat = this.estimateTxFee(tbc.desiredFeeRate, 1, 0, tbc.externalOutputAddresses)
    const idealSolutionMinSat = tbc.desiredOutputTotal + (tbc.recipientPaysFee ? 0 : idealSolutionFeeSat)
    const idealSolutionMaxSat = idealSolutionMinSat + this.dustThreshold

    this.selectFromAvailableUtxos(tbc, idealSolutionMinSat, idealSolutionMaxSat, idealSolutionFeeSat)
  }

  private selectFromAvailableUtxos(
    tbc: BitcoinishTxBuildContext,
    idealSolutionMinSat: number,
    idealSolutionMaxSat: number,
    idealSolutionFeeSat: number,
  ) {
    // check if there is any perfectly matching utxo to be used
    for (const utxo of tbc.unusedUtxos) {
      if (utxo.satoshis as number >= idealSolutionMinSat && utxo.satoshis as number <= idealSolutionMaxSat) {
        this.logger.log(`${this.coinSymbol} buildPaymentTx - `
          + `Found ideal ${this.coinSymbol} input utxo solution to send ${tbc.desiredOutputTotal} sat `
          + `${tbc.recipientPaysFee ? 'less' : 'plus'} fee of ${idealSolutionFeeSat} sat `
          + `using single utxo ${utxo.txid}:${utxo.vout}`
        )
        tbc.inputUtxos.push(utxo)
        tbc.inputTotal += utxo.satoshis as number
        this.adjustTxFee(tbc, idealSolutionFeeSat)
        return
      }
    }

    let feeSat = 0
    // Incrementally select utxos until we cover outputs and fees
    for (const utxo of shuffleUtxos(tbc.unusedUtxos)) {
      tbc.inputUtxos.push(utxo)
      tbc.inputTotal += utxo.satoshis as number

      const targetChangeOutputCount = this.determineTargetChangeOutputCount(
        tbc.unusedUtxoCount,
        tbc.inputUtxos.length,
      )
      feeSat = this.estimateTxFee(
        tbc.desiredFeeRate,
        tbc.inputUtxos.length,
        targetChangeOutputCount,
        tbc.externalOutputAddresses,
      )
      const neededSat = tbc.externalOutputTotal + (tbc.recipientPaysFee ? 0 : feeSat)
      if (tbc.inputTotal >= neededSat) {
        break
      }
    }

    this.adjustTxFee(tbc, feeSat)
  }

  private allocateChangeOutputs(tbc: BitcoinishTxBuildContext): void {
    tbc.totalChange = tbc.inputTotal - tbc.externalOutputTotal - tbc.feeSat
    if (tbc.totalChange < 0) {
      throw new Error(`${this.coinSymbol} buildPaymentTx - totalChange is negative when building tx, this shouldnt happen!`)
    }
    if (tbc.totalChange === 0) {
      this.logger.debug(`${this.coinSymbol} buildPaymentTx - no change to allocate`)
      return
    }
    const targetChangeOutputCount = this.determineTargetChangeOutputCount(
      tbc.unusedUtxoCount,
      tbc.inputUtxos.length,
    )
    const changeOutputWeights = this.createWeightedChangeOutputs(targetChangeOutputCount, tbc.changeAddress)
    const totalChangeWeight = changeOutputWeights.reduce((total, { weight }) => total += weight, 0)
    let totalChangeAllocated = 0 // Total sat of all change outputs we actually include (omitting dust)
    for (let i = 0; i < changeOutputWeights.length; i++) {
      const { address, weight } = changeOutputWeights[i]
      // Distribute change proportional to each change outputs weight. Floored to not exceed inputTotal
      const changeSat = Math.floor(tbc.totalChange * (weight / totalChangeWeight))
      if (changeSat <= this.dustThreshold || changeSat < this.minChangeSat) {
        this.logger.debug(
          `${this.coinSymbol} buildPaymentTx - desired change output ${i} is below dust threshold or minChange, ` +
          'will redistribute to other change outputs or add to fee'
        )
      } else {
        tbc.changeOutputs.push({ address, satoshis: changeSat })
        totalChangeAllocated += changeSat
      }
    }
    let changeOutputCount = tbc.changeOutputs.length
    this.logger.debug(
      `${this.coinSymbol} buildPaymentTx`,
      { changeOutputWeights, totalChangeWeight, totalChangeAllocated, changeOutputs: tbc.changeOutputs },
    )

    // Amount of change not yet added to a change output
    let looseChange = tbc.totalChange - totalChangeAllocated

    // If due to rounding or omitting dust outputs we have fewer change outputs than expected, adjust fees accordingly
    if (changeOutputCount < targetChangeOutputCount) {
      const recalculatedFee = this.estimateTxFee(
        tbc.desiredFeeRate,
        tbc.inputUtxos.length,
        changeOutputCount || 1, // minimum one change output for loose change
        tbc.externalOutputAddresses,
      )
      if (tbc.feeSat > recalculatedFee) {
        // Due to dropping change outputs we're now overpaying, reduce fee and reallocate to change
        this.logger.log(`${this.coinSymbol} buildPaymentTx - Reducing overestimated fee from ${tbc.feeSat} sat to ${recalculatedFee} sat`)
        const feeBefore = tbc.feeSat
        this.adjustTxFee(tbc, recalculatedFee)
        const adjustedAmount = feeBefore - tbc.feeSat
        tbc.totalChange += adjustedAmount
        looseChange += adjustedAmount
      }
    }

    // Attempt to allocate any loose change to existing change outputs, or a single change output
    if (looseChange < 0) {
      throw new Error(`${this.coinSymbol} buildPaymentTx - looseChange should never be negative!`)
    } else if (changeOutputCount > 0 && looseChange / changeOutputCount > 1) {
      // Enough loose change to reallocate amongst all change outputs
      const extraSatPerChangeOutput = Math.floor(looseChange / changeOutputCount)
      this.logger.log(`${this.coinSymbol} buildPaymentTx - redistributing looseChange of ${extraSatPerChangeOutput} per change output`)
      for (let i = 0; i < changeOutputCount; i++) {
        tbc.changeOutputs[i].satoshis += extraSatPerChangeOutput
      }
      looseChange -= extraSatPerChangeOutput * changeOutputCount
    } else if (changeOutputCount === 0 && looseChange > this.dustThreshold) {
      this.logger.log(`${this.coinSymbol} buildPaymentTx - allocating looseChange towards single ${looseChange} sat change output`)
      tbc.changeOutputs.push({ address: tbc.changeAddress, satoshis: looseChange })
      changeOutputCount += 1
      looseChange = 0
    }

    // If there is still a negligible amount of loose change just add it to the fee
    if (looseChange > 0) {
      if (looseChange > this.dustThreshold) {
        throw new Error(
          `${this.coinSymbol} buildPaymentTx - Ended up with loose change (${looseChange} sat) exceeding dust threshold, this should never happen!`
        )
      }
      this.adjustTxFee(tbc, tbc.feeSat + looseChange)
      tbc.totalChange -= looseChange
    }
  }

  /**
   * Build a simple payment transaction.
   * Note: fee will be subtracted from first output when attempting to send entire account balance
   * Note: All amounts/values should be input and output as main denomination strings for consistent
   * serialization. Within this function they're converted to JS Numbers for convenient arithmetic
   * then converted back to strings before being returned.
   */
  async buildPaymentTx(params: BitcoinishBuildPaymentTxParams): Promise<Required<BitcoinishPaymentTx>> {
    const utxoSpendCost = this.estimateTxFee(params.desiredFeeRate, 1, 0, [])
    - this.estimateTxFee(params.desiredFeeRate, 0, 0, [])

    const tbc: BitcoinishTxBuildContext = {
      ...params,
      desiredOutputTotal: 0,
      externalOutputs: [],
      externalOutputTotal: 0,
      externalOutputAddresses: [],
      isSweep: false,
      inputUtxos: [],
      inputTotal: 0,
      feeSat: 0,
      totalChange: 0,
      changeOutputs: [],
      unusedUtxoCount: params.unusedUtxos.length,
      enforcedUtxos: this.processUtxos(params.enforcedUtxos, params.useUnconfirmedUtxos),
      unusedUtxos: this.processUtxos(params.unusedUtxos, params.useUnconfirmedUtxos)
        .filter((utxo) => {
          if (utxo.satoshis as number > utxoSpendCost) {
            return true
          }
          this.logger.log(`${this.coinSymbol} buildPaymentTx - Ignoring dust utxo (${utxoSpendCost} sat or lower) ${utxo.txid}:${utxo.vout}`)
        }),
    }
    if (params.enforcedUtxos.length > 0 && tbc.enforcedUtxos.length === 0) {
      throw new Error(`${this.coinSymbol} buildPaymentTx - Failed to create replacement tx: all enforced utxos are unconfirmed`)
    }

    for (let i = 0; i < tbc.desiredOutputs.length; i++) {
      const { address, value } = tbc.desiredOutputs[i]
      // validate
      if (!await this.isValidAddress(address)) {
        throw new Error(`Invalid ${this.coinSymbol} address ${address} provided for output ${i}`)
      }
      const satoshis = this.toBaseDenominationNumber(value)
      if (isNaN(satoshis) || satoshis <= 0) {
        throw new Error(`Invalid ${this.coinSymbol} value (${value}) provided for output ${i} (${address}) - not a positive, non-zero number`)
      }
      if (satoshis <= this.dustThreshold) {
        throw new Error(`Invalid ${this.coinSymbol} value (${value}) provided for output ${i} (${address}) - below dust threshold (${this.dustThreshold} sat)`)
      }
      tbc.externalOutputs.push({ address, satoshis })
      tbc.externalOutputAddresses.push(address)
      tbc.externalOutputTotal += satoshis
      tbc.desiredOutputTotal += satoshis
    }
    if (!await this.isValidAddress(tbc.changeAddress)) {
      throw new Error (`Invalid ${this.coinSymbol} change address ${tbc.changeAddress} provided`)
    }
    const unfilteredUtxoTotal = sumUtxoValue(params.unusedUtxos, params.useUnconfirmedUtxos)
    // TODO: createSweepTransaction could just pass this in directly
    tbc.isSweep = tbc.useAllUtxos && tbc.desiredOutputTotal >= unfilteredUtxoTotal.toNumber()

    this.selectInputUtxos(tbc)
    this.logger.debug(`${this.coinSymbol} buildPaymentTx - context after utxo input selection`, tbc)

    this.allocateChangeOutputs(tbc)
    this.logger.debug(`${this.coinSymbol} buildPaymentTx - context after allocating change outputs`, tbc)

    const externalOutputsResult = this.convertOutputsToExternalFormat(tbc.externalOutputs)
    const changeOutputsResult = this.convertOutputsToExternalFormat(tbc.changeOutputs)
    const outputsResult = [...externalOutputsResult, ...changeOutputsResult]
    return {
      inputs: tbc.inputUtxos,
      outputs: outputsResult,
      fee: this.toMainDenominationString(tbc.feeSat),
      change: this.toMainDenominationString(tbc.totalChange),
      changeAddress: tbc.changeOutputs.length === 1 ? tbc.changeOutputs[0].address : null, // back compat
      changeOutputs: changeOutputsResult,
      externalOutputs: externalOutputsResult,
      externalOutputTotal: this.toMainDenominationString(tbc.externalOutputTotal),
      rawHex: '',
      rawHash: '',
    }
  }

  /**
   * Creates a list of change addresses with an exponential weight distribution to use for
   * maintaining a pool of utxos.
   */
  private createWeightedChangeOutputs(
    changeOutputCount: number,
    changeAddress: string,
  ): BitcoinishWeightedChangeOutput[] {
    const result: BitcoinishWeightedChangeOutput[] = []
    for (let i = 0; i < changeOutputCount; i++) {
      result.push({ address: changeAddress, weight: 2 ** i })
    }
    return result
  }

  async createTransaction(
    from: number,
    to: ResolveablePayport,
    amount: Numeric,
    options?: CreateTransactionOptions,
  ): Promise<BitcoinishUnsignedTransaction> {
    return this.createMultiOutputTransaction(from, [{ payport: to, amount }], options)
  }

  async createMultiOutputTransaction(
    from: number,
    to: PayportOutput[],
    options: CreateTransactionOptions = {},
  ): Promise<BitcoinishUnsignedTransaction> {
    assertType(t.array(PayportOutput), to)
    this.logger.debug('createMultiOutputTransaction', from, to, options)

    const unusedUtxos = options.availableUtxos || await this.getUtxos(from)
    this.logger.debug('createMultiOutputTransaction unusedUtxos', unusedUtxos)

    const { address: fromAddress } = await this.resolvePayport(from)

    const desiredOutputs = await Promise.all(to.map(async ({ payport, amount }) => ({
      address: (await this.resolvePayport(payport)).address,
      value: String(amount),
    })))

    const { targetFeeLevel, targetFeeRate, targetFeeRateType } = await this.resolveFeeOption(options)
    this.logger.debug(`createMultiOutputTransaction resolvedFeeOption ${targetFeeLevel} ${targetFeeRate} ${targetFeeRateType}`)

    const paymentTx = await this.buildPaymentTx({
      unusedUtxos,
      enforcedUtxos: options.forcedUtxos || [],
      desiredOutputs,
      changeAddress: fromAddress,
      desiredFeeRate: { feeRate: targetFeeRate, feeRateType: targetFeeRateType },
      useAllUtxos: options.useAllUtxos ?? false,
      useUnconfirmedUtxos: options.useUnconfirmedUtxos ?? false,
      recipientPaysFee: options.recipientPaysFee ?? false,
    })
    const unsignedTxHex = await this.serializePaymentTx(paymentTx, from)
    paymentTx.rawHex = unsignedTxHex
    paymentTx.rawHash = sha256FromHex(unsignedTxHex)
    this.logger.debug('createMultiOutputTransaction data', paymentTx)
    const feeMain = paymentTx.fee

    let resultToAddress = 'batch'
    let resultToIndex = null
    if (paymentTx.externalOutputs.length === 1) {
      const onlyOutput = paymentTx.externalOutputs[0]
      resultToAddress = onlyOutput.address
      resultToIndex = isNumber(to[0].payport) ? to[0].payport : null
    }

    return {
      status: TransactionStatus.Unsigned,
      id: null,
      fromIndex: from,
      fromAddress,
      fromExtraId: null,
      toIndex: resultToIndex,
      toAddress: resultToAddress,
      toExtraId: null,
      amount: paymentTx.externalOutputTotal,
      targetFeeLevel,
      targetFeeRate,
      targetFeeRateType,
      fee: feeMain,
      sequenceNumber: null,
      inputUtxos: paymentTx.inputs,
      externalOutputs: paymentTx.externalOutputs,
      data: paymentTx,
    }
  }

  async createServiceTransaction(
    from: number,
    options: CreateTransactionOptions = {},
  ): Promise<null> {
    return null
  }

  async createSweepTransaction(
    from: number,
    to: ResolveablePayport,
    options: CreateTransactionOptions = {},
  ): Promise<BitcoinishUnsignedTransaction> {
    this.logger.debug('createSweepTransaction', from, to, options)

    const availableUtxos = isUndefined(options.availableUtxos)
      ? await this.getUtxos(from)
      : options.availableUtxos

    if (availableUtxos.length === 0) {
      throw new Error('No available utxos to sweep')
    }
    const useUnconfirmedUtxos = isUndefined(options.useUnconfirmedUtxos) ? true : options.useUnconfirmedUtxos
    const outputAmount = sumUtxoValue(availableUtxos, useUnconfirmedUtxos)
    if (!this.isSweepableBalance(outputAmount)) {
      throw new Error(`Available utxo total ${outputAmount} ${this.coinSymbol} too low to sweep`)
    }
    const updatedOptions = {
      ...options,
      useUnconfirmedUtxos,
      utxos: availableUtxos,
      useAllUtxos: true,
    }
    return this.createTransaction(from, to, outputAmount, updatedOptions)
  }

  async broadcastTransaction(tx: BitcoinishSignedTransaction): Promise<BitcoinishBroadcastResult> {
    let txId: string
    try {
      txId = await this._retryDced(() => this.getApi().sendTx(tx.data.hex))
      if (tx.id !== txId) {
        this.logger.warn(`Broadcasted ${this.coinSymbol} txid ${txId} doesn't match original txid ${tx.id}`)
      }
    } catch(e) {
      const message = e.message || ''
      if (message.startsWith('-27')) {
        txId = tx.id
      } else {
        throw e
      }
    }
    return {
      id: tx.id,
    }
  }

  async getTransactionInfo(txId: string): Promise<BitcoinishTransactionInfo> {
    const tx = await this._retryDced(() => this.getApi().getTx(txId))

    const fee = this.toMainDenominationString(tx.fees)

    const currentBlockNumber = (await this.getApi().getStatus()).blockbook.bestHeight

    const confirmationId = tx.blockHash || null
    const confirmationNumber = tx.blockHeight ? String(tx.blockHeight) : undefined
    const confirmationTimestamp = tx.blockTime ? new Date(tx.blockTime * 1000) : null
    if (tx.confirmations > 0x7FFFFFFF) {
      // If confirmations exceeds the max value of a signed 32 bit integer, assume we have bad data
      // Blockbook sometimes returns a confirmations count equal to `0xFFFFFFFF`
      // Bitcoin won't have that many confirmations for 40,000 years
      throw new Error(`Blockbook returned confirmations count for tx ${txId} that's way too big to be real (${tx.confirmations})`)
    }
    const isConfirmed = Boolean(tx.confirmations && tx.confirmations > 0)
    const status = isConfirmed ? TransactionStatus.Confirmed : TransactionStatus.Pending
    const inputUtxos = tx.vin.map(({ txid, vout, value }): UtxoInfo => ({
      txid: txid || '',
      vout: vout || 0,
      value: this.toMainDenominationString(value || 0),
    }))
    const fromAddress = get(tx, 'vin.0.addresses.0')
    if (!fromAddress) {
      throw new Error(`Unable to determine fromAddress of ${this.coinSymbol} tx ${txId}`)
    }

    const externalOutputs = tx.vout
      .map(({ addresses, value }): TransactionOutput => (
        {
          address: addresses[0],
          value: this.toMainDenominationString(value || 0),
        }
      ))
      .filter(({ address }) => address !== fromAddress)
    const amount = externalOutputs.reduce((total, { value }) => total.plus(value), new BigNumber(0))

    let toAddress
    if (externalOutputs.length > 1) {
      toAddress = 'multioutput'
    } else if (externalOutputs.length === 1) {
      toAddress = externalOutputs[0].address
    } else {
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
      amount: amount.toFixed(),
      fee,
      sequenceNumber: null,
      confirmationId,
      confirmationNumber,
      currentBlockNumber,
      confirmationTimestamp,
      isExecuted: isConfirmed,
      isConfirmed,
      confirmations: tx.confirmations,
      data: tx,
      inputUtxos,
      externalOutputs,
    }
  }

  private processUtxos(utxos: UtxoInfo[], useUnconfirmedUtxos: boolean): UtxoInfo[] {
    return utxos.map((utxo) => {
      return {
        ...utxo,
        satoshis: isUndefined(utxo.satoshis)
          ? this.toBaseDenominationNumber(utxo.value)
          : toBigNumber(utxo.satoshis).toNumber()
      }
    }).filter((utxo) => (useUnconfirmedUtxos || isConfirmedUtxo(utxo)))
  }
}
