import {
  BasePayments,
  BalanceResult,
  CreateTransactionOptions,
  FeeOption,
  ResolvedFeeOption,
  FromTo,
  Payport,
  FeeLevel,
  FeeRateType,
} from '@faast/payments-common'
import { Logger, assertType, isNil } from '@faast/ts-common'
import BigNumber from 'bignumber.js'
import { RippleAPI } from 'ripple-lib'
import { FormattedPaymentTransaction, FormattedPayment, Prepare } from 'ripple-lib/dist/npm/transaction/types'
import { Adjustment } from 'ripple-lib/dist/npm/common/types/objects'

import {
  BaseRipplePaymentsConfig,
  RippleUnsignedTransaction,
  RippleSignedTransaction,
  RippleBroadcastResult,
  RippleTransactionInfo,
  RippleCreateTransactionOptions,
  FromToWithPayport,
  RippleSignatory,
} from './types'
import { RipplePaymentsUtils } from './RipplePaymentsUtils'
import { DEFAULT_CREATE_TRANSACTION_OPTIONS, MIN_BALANCE, DEFAULT_MAX_LEDGER_VERSION_OFFSET } from './constants'
import { assertValidAddress, assertValidExtraIdOrNil } from './helpers'

function extraIdToTag(extraId: string | null | undefined): number | undefined {
  return isNil(extraId) ? undefined : Number.parseInt(extraId)
}
function serializePayport(payport: Payport): string {
  return isNil(payport.extraId) ? payport.address : `${payport.address}:${payport.extraId}`
}

export abstract class BaseRipplePayments<Config extends BaseRipplePaymentsConfig> extends RipplePaymentsUtils
  implements
    BasePayments<
      Config,
      RippleUnsignedTransaction,
      RippleSignedTransaction,
      RippleBroadcastResult,
      RippleTransactionInfo
    > {
  readonly rippleApi: RippleAPI
  readonly logger: Logger

  constructor(public readonly config: Config) {
    super(config)
    assertType(BaseRipplePaymentsConfig, config)
    if (config.server) {
      this.rippleApi = new RippleAPI({
        server: config.server,
      })
    } else {
      this.rippleApi = new RippleAPI()
    }
  }

  getFullConfig() {
    return this.config
  }

  abstract getPublicConfig(): Config

  abstract getAccountIds(): string[]

  abstract getAccountId(index: number): string

  abstract getHotSignatory(): RippleSignatory

  abstract getDepositSignatory(): RippleSignatory

  abstract isReadOnly(): boolean

  async resolvePayport(payportOrIndex: Payport | number): Promise<Payport> {
    if (typeof payportOrIndex === 'number') {
      return this.getPayport(payportOrIndex)
    }
    const payport = payportOrIndex
    assertValidAddress(payport.address)
    assertValidExtraIdOrNil(payport.extraId)
    return payport
  }

  async resolveFromTo(from: number, to: Payport | number): Promise<FromToWithPayport> {
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

  async getPayport(index: number): Promise<Payport> {
    if (index === 0) {
      return { address: this.getHotSignatory().address }
    }
    if (index === 1) {
      return { address: this.getDepositSignatory().address }
    }
    return { address: this.getDepositSignatory().address, extraId: String(index) }
  }

  requiresBalanceMonitor() {
    return true
  }

  isSweepableAddressBalance(balance: string): boolean {
    return new BigNumber(balance).gt(MIN_BALANCE)
  }

  async getBalance(payportOrIndex: Payport | number): Promise<BalanceResult> {
    const payport = await this.resolvePayport(payportOrIndex)
    const { address, extraId } = payport
    if (!isNil(extraId)) {
      throw new Error(`Cannot getBalance of ripple payport with extraId ${extraId}, use BalanceMonitor instead`)
    }
    const balances = await this.rippleApi.getBalances(address)
    const xrpBalance = balances.find(({ currency }) => currency === 'XRP')
    const xrpAmount = xrpBalance ? xrpBalance.value : '0'
    return {
      confirmedBalance: xrpAmount,
      unconfirmedBalance: '0',
      sweepable: this.isSweepableAddressBalance(xrpAmount),
    }
  }

  resolveIndexFromAdjustment(adjustment: Adjustment): number | null {
    const { address, tag } = adjustment
    if (address === this.getHotSignatory().address) {
      return 0
    } else if (address === this.getDepositSignatory().address) {
      return tag || 1
    }
    return null
  }

  async getTransactionInfo(txId: string): Promise<RippleTransactionInfo> {
    const tx = await this.rippleApi.getTransaction(txId)
    if (tx.type !== 'payment') {
      throw new Error(`Unsupported ripple tx type ${tx.type}`)
    }
    const { specification, outcome } = tx as FormattedPaymentTransaction
    const { source, destination } = specification
    if (source.amount.currency !== 'xrp') {
      throw new Error(`Unsupported ripple tx currency ${source.amount.currency}`)
    }
    const fromIndex = this.resolveIndexFromAdjustment(source)
    const toIndex = this.resolveIndexFromAdjustment(destination)
    const amount = source.amount.value
    const status = outcome.result.startsWith('tes') ? 'confirmed' : 'failed'
    const confirmationNumber = outcome.ledgerVersion
    const ledger = await this.rippleApi.getLedger({ ledgerVersion: confirmationNumber })
    const currentLedgerVersion = await this.rippleApi.getLedgerVersion()
    const confirmationId = ledger.ledgerHash
    const confirmationTimestamp = outcome.timestamp ? new Date(outcome.timestamp) : null
    return {
      id: tx.id,
      fromIndex,
      fromAddress: source.address,
      fromExtraId: typeof source.tag !== 'undefined' ? String(source.tag) : null,
      toIndex,
      toAddress: destination.address,
      toExtraId: typeof destination.tag !== 'undefined' ? String(destination.tag) : null,
      amount: amount,
      fee: outcome.fee,
      status,
      confirmationId,
      confirmationTimestamp,
      isExecuted: status === 'confirmed',
      isConfirmed: true,
      confirmations: currentLedgerVersion - confirmationNumber,
      data: tx,
    }
  }

  async resolveFeeOption(feeOption: FeeOption): Promise<ResolvedFeeOption> {
    let targetFeeLevel
    let targetFeeRate
    let targetFeeRateType
    let feeMain: string
    let feeBase: string
    if (feeOption.feeLevel === FeeLevel.Custom) {
      targetFeeLevel = feeOption.feeLevel
      targetFeeRate = feeOption.feeRate
      targetFeeRateType = feeOption.feeRateType
      if (targetFeeRateType === FeeRateType.Base) {
        feeBase = targetFeeRate
        feeMain = this.toMainDenomination(feeBase)
      } else if (targetFeeRateType === FeeRateType.Main) {
        feeMain = targetFeeRate
        feeBase = this.toBaseDenomination(feeMain)
      } else {
        throw new Error(`Unsupport ripple feeRateType ${feeOption.feeRateType}`)
      }
    } else {
      targetFeeLevel = feeOption.feeLevel || FeeLevel.Medium
      let cushion: number | undefined
      if (targetFeeLevel === FeeLevel.Low) {
        cushion = 1
      } else if (targetFeeLevel === FeeLevel.Medium) {
        cushion = 1.2
      } else if (targetFeeLevel === FeeLevel.High) {
        cushion = 1.5
      }
      feeMain = await this.rippleApi.getFee(cushion)
      feeBase = this.toBaseDenomination(feeMain)
      targetFeeRate = feeMain
      targetFeeRateType = FeeRateType.Main
    }
    return {
      targetFeeLevel,
      targetFeeRate,
      targetFeeRateType,
      feeMain,
      feeBase,
    }
  }

  private async resolvePayportBalance(options: RippleCreateTransactionOptions): Promise<BigNumber> {
    if (typeof options.payportBalance !== 'string') {
      throw new Error('ripple-payments createSweepTransaction missing required payportBalance option')
    }
    const payportBalance = new BigNumber(options.payportBalance)
    if (payportBalance.isNaN()) {
      throw new Error(`Invalid NaN payportBalance option provided: ${options.payportBalance}`)
    }
    return payportBalance
  }

  private async doCreateTransaction(
    fromTo: FromToWithPayport,
    feeOption: ResolvedFeeOption,
    amount: BigNumber,
    payportBalance: BigNumber,
    options: RippleCreateTransactionOptions,
  ): Promise<RippleUnsignedTransaction> {
    if (amount.isNaN() || amount.lte(0)) {
      throw new Error(`Invalid amount provided to ripple-payments createTransaction: ${amount}`)
    }
    const { fromIndex, fromAddress, fromExtraId, fromPayport, toIndex, toAddress, toExtraId, toPayport } = fromTo
    const { targetFeeLevel, targetFeeRate, targetFeeRateType, feeMain } = feeOption
    const { sequence } = options
    const maxLedgerVersionOffset =
      options.maxLedgerVersionOffset || this.config.maxLedgerVersionOffset || DEFAULT_MAX_LEDGER_VERSION_OFFSET
    const amountString = amount.toString()
    const addressBalances = await this.getBalance({ address: fromAddress })
    const addressBalance = new BigNumber(addressBalances.confirmedBalance)
    if (addressBalance.lt(MIN_BALANCE)) {
      throw new Error(
        `Cannot send from ripple address that has less than ${MIN_BALANCE} XRP: ${fromAddress} (${addressBalance} XRP)`,
      )
    }
    const totalValue = amount.plus(feeMain)
    if (addressBalance.minus(totalValue).lt(MIN_BALANCE)) {
      throw new Error(
        `Cannot send ${amountString} XRP with fee of ${feeMain} XRP because it would reduce the balance below ` +
          `the minimum required balance of ${MIN_BALANCE} XRP: ${fromAddress} (${addressBalance} XRP)`,
      )
    }
    if (typeof fromExtraId === 'string' && totalValue.gt(payportBalance)) {
      throw new Error(
        `Insufficient payport balance of ${payportBalance} XRP to send ${amountString} XRP ` +
          `with fee of ${feeMain} XRP: ${serializePayport(fromPayport)}`,
      )
    }
    const preparedTx = this.rippleApi.preparePayment(
      fromAddress,
      {
        source: {
          address: fromAddress,
          tag: extraIdToTag(fromExtraId),
          amount: {
            currency: 'XRP',
            value: amountString,
          },
        },
        destination: {
          address: toAddress,
          tag: extraIdToTag(toExtraId),
          amount: {
            currency: 'XRP',
            value: amountString,
          },
        },
      },
      {
        maxLedgerVersionOffset,
        sequence,
      },
    )
    return {
      id: null,
      fromIndex,
      fromAddress,
      fromExtraId,
      toIndex,
      toAddress,
      toExtraId,
      amount: amountString,
      targetFeeLevel,
      targetFeeRate,
      targetFeeRateType,
      fee: feeMain,
      status: 'unsigned',
      data: preparedTx,
    }
  }

  async createTransaction(
    from: number,
    to: Payport | number,
    amount: string,
    options: RippleCreateTransactionOptions = DEFAULT_CREATE_TRANSACTION_OPTIONS,
  ): Promise<RippleUnsignedTransaction> {
    const fromTo = await this.resolveFromTo(from, to)
    const feeOption = await this.resolveFeeOption(options)
    const payportBalance = await this.resolvePayportBalance(options)
    const amountBn = new BigNumber(amount)
    return this.doCreateTransaction(fromTo, feeOption, amountBn, payportBalance, options)
  }

  async createSweepTransaction(
    from: number,
    to: Payport | number,
    options: RippleCreateTransactionOptions = DEFAULT_CREATE_TRANSACTION_OPTIONS,
  ): Promise<RippleUnsignedTransaction> {
    const fromTo = await this.resolveFromTo(from, to)
    const feeOption = await this.resolveFeeOption(options)
    const payportBalance = await this.resolvePayportBalance(options)
    let amountBn = payportBalance.minus(feeOption.feeMain)
    if (amountBn.lt(0)) {
      const fromPayport = { address: fromTo.fromAddress, extraId: fromTo.fromExtraId }
      throw new Error(
        `Insufficient balance to sweep from ripple payport with fee of ${feeOption.feeMain} XRP: ` +
          `${serializePayport(fromPayport)} (${payportBalance} XRP)`,
      )
    }
    if (typeof fromTo.fromExtraId !== 'string') {
      amountBn = amountBn.minus(MIN_BALANCE)
      if (amountBn.lt(0)) {
        throw new Error(
          `Insufficient balance to sweep from ripple address with fee of ${feeOption.feeMain} XRP and ` +
            `maintain the minimum required balance of ${MIN_BALANCE} XRP: ` +
            `${fromTo.fromAddress} (${payportBalance} XRP)`,
        )
      }
    }
    return this.doCreateTransaction(fromTo, feeOption, amountBn, payportBalance, options)
  }

  async signTransaction(unsignedTx: RippleUnsignedTransaction): Promise<RippleSignedTransaction> {
    assertType(RippleUnsignedTransaction, unsignedTx)
    if (this.isReadOnly()) {
      throw new Error('Cannot sign transaction with read only ripple payments (no xprv or secrets provided)')
    }
    const { txJSON } = unsignedTx.data as Prepare
    let secret
    const hotSignatory = this.getHotSignatory()
    const depositSignatory = this.getDepositSignatory()
    if (unsignedTx.fromAddress === hotSignatory.address) {
      secret = hotSignatory.secret
    } else if (unsignedTx.fromAddress === depositSignatory.address) {
      secret = depositSignatory.secret
    } else {
      throw new Error(`Cannot sign ripple transaction from address ${unsignedTx.fromAddress}`)
    }
    const signResult = this.rippleApi.sign(txJSON, secret)
    return {
      ...unsignedTx,
      id: signResult.id,
      data: signResult,
      status: 'signed',
    }
  }

  async broadcastTransaction(signedTx: RippleSignedTransaction): Promise<RippleBroadcastResult> {
    assertType(RippleSignedTransaction, signedTx)
    const signedTxString = (signedTx.data as any).signedTransaction as string
    let rebroadcast: boolean = false
    try {
      const existing = await this.getTransactionInfo(signedTx.id)
      rebroadcast = existing.id === signedTx.id
    } catch (e) {}
    const result = (await this.rippleApi.submit(signedTxString)) as any
    const resultCode = result.engine_result || result.resultCode || ''
    if (!resultCode.startsWith('tes')) {
      throw new Error(`Failed to broadcast ripple tx ${signedTx.id} with result code ${resultCode}`)
    }
    return {
      id: result,
      rebroadcast,
      data: result,
    }
  }
}
