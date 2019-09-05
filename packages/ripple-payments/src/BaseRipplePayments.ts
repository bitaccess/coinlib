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
  TransactionStatus,
  ResolveablePayport,
} from '@faast/payments-common'
import { Logger, assertType, isNil, Numeric } from '@faast/ts-common'
import BigNumber from 'bignumber.js'
import { RippleAPI } from 'ripple-lib'
import { FormattedPaymentTransaction, FormattedPayment, Prepare } from 'ripple-lib/dist/npm/transaction/types'
import { Adjustment, Amount } from 'ripple-lib/dist/npm/common/types/objects'

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
import {
  DEFAULT_CREATE_TRANSACTION_OPTIONS,
  MIN_BALANCE,
  DEFAULT_MAX_LEDGER_VERSION_OFFSET,
  NOT_FOUND_ERRORS,
} from './constants'
import { assertValidAddress, assertValidExtraIdOrNil, toBaseDenominationBigNumber } from './helpers'
import { isString } from 'util'
import { resolveRippleServer, retryIfDisconnected } from './utils'

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
  rippleApi: RippleAPI
  logger: Logger

  constructor(public config: Config) {
    super(config)
    assertType(BaseRipplePaymentsConfig, config)
    this.rippleApi = resolveRippleServer(config.server, this.networkType)
  }

  async init(): Promise<void> {
    if (!this.rippleApi.isConnected()) {
      await this.rippleApi.connect()
    }
    await this.initAccounts()
  }

  async destroy(): Promise<void> {
    if (this.rippleApi.isConnected()) {
      await this.rippleApi.disconnect()
    }
  }

  private async retryDced<T>(fn: () => Promise<T>): Promise<T> {
    return retryIfDisconnected(fn, this.rippleApi, this.logger)
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

  private doGetPayport(index: number): Payport {
    if (index === 0) {
      return { address: this.getHotSignatory().address }
    }
    if (index === 1) {
      return { address: this.getDepositSignatory().address }
    }
    return { address: this.getDepositSignatory().address, extraId: String(index) }
  }

  private doResolvePayport(payport: ResolveablePayport): Payport {
    if (typeof payport === 'number') {
      return this.doGetPayport(payport)
    } else if (typeof payport === 'string') {
      assertValidAddress(payport)
      return { address: payport }
    }
    assertValidAddress(payport.address)
    assertValidExtraIdOrNil(payport.extraId)
    return payport
  }

  async resolvePayport(payport: ResolveablePayport): Promise<Payport> {
    return this.doResolvePayport(payport)
  }

  async resolveFromTo(from: number, to: ResolveablePayport): Promise<FromToWithPayport> {
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
    return this.doGetPayport(index)
  }

  requiresBalanceMonitor() {
    return true
  }

  getAddressesToMonitor(): string[] {
    return [this.getHotSignatory().address, this.getDepositSignatory().address]
  }

  isSweepableAddressBalance(balance: Numeric): boolean {
    return new BigNumber(balance).gt(0)
  }

  isSweepableBalance(balance: string, payport?: ResolveablePayport): boolean {
    const balanceBase = toBaseDenominationBigNumber(balance)
    if (payport) {
      payport = this.doResolvePayport(payport)
      if (isNil(payport.extraId)) {
        return this.isSweepableAddressBalance(balanceBase)
      }
    }
    return balanceBase.gt(0)
  }

  /**
   * A special method that broadcasts a transaction that enables the `requireDestinationTag` setting
   * on the deposit signatory.
   */
  async initAccounts() {
    const { address, secret } = this.getDepositSignatory()
    const settings = await this.rippleApi.getSettings(address)
    if (settings.requireDestinationTag) {
      return
    }
    if (this.isReadOnly()) {
      this.logger.warn(`Deposit account (${address}) doesn't have requireDestinationTag property set`)
      return
    }
    const { confirmedBalance } = await this.getBalance(address)
    const { feeMain } = await this.resolveFeeOption({ feeLevel: FeeLevel.Medium })
    if (new BigNumber(confirmedBalance).lt(feeMain)) {
      this.logger.warn(
        `Insufficient balance in deposit account (${address}) to pay fee of ${feeMain} XRP ` +
          'to send a transaction that sets requireDestinationTag property to true',
      )
    }
    const unsignedTx = await this.retryDced(() =>
      this.rippleApi.prepareSettings(address, {
        requireDestinationTag: true,
      }),
    )
    const signedTx = this.rippleApi.sign(unsignedTx.txJSON, secret)
    const broadcast = await this.retryDced(() => this.rippleApi.submit(signedTx.signedTransaction))
    return {
      txId: signedTx.id,
      unsignedTx,
      signedTx,
      broadcast,
    }
  }

  async getBalance(payportOrIndex: ResolveablePayport): Promise<BalanceResult> {
    const payport = await this.resolvePayport(payportOrIndex)
    const { address, extraId } = payport
    if (!isNil(extraId)) {
      throw new Error(`Cannot getBalance of ripple payport with extraId ${extraId}, use BalanceMonitor instead`)
    }
    const balances = await this.retryDced(() => this.rippleApi.getBalances(address))
    this.logger.debug(`rippleApi.getBalance ${address}`, balances)
    const xrpBalance = balances.find(({ currency }) => currency === 'XRP')
    const xrpAmount = xrpBalance && xrpBalance.value ? xrpBalance.value : '0'
    // Subtract locked up min balance from result to avoid confusion about what is actually spendable
    const confirmedBalance = new BigNumber(xrpAmount).minus(MIN_BALANCE)
    return {
      confirmedBalance: confirmedBalance.toString(),
      unconfirmedBalance: '0',
      sweepable: this.isSweepableAddressBalance(xrpAmount),
    }
  }

  async getNextSequenceNumber(payportOrIndex: ResolveablePayport): Promise<number> {
    const payport = await this.resolvePayport(payportOrIndex)
    const { address } = payport
    const accountInfo = await this.retryDced(() => this.rippleApi.getAccountInfo(address))
    return accountInfo.sequence
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
    let tx
    try {
      tx = await this.retryDced(() => this.rippleApi.getTransaction(txId))
    } catch (e) {
      const eString = e.toString()
      if (NOT_FOUND_ERRORS.some(type => eString.includes(type))) {
        throw new Error(`Transaction not found: ${eString}`)
      }
      throw e
    }
    this.logger.debug('getTransaction', txId, tx)
    if (tx.type !== 'payment') {
      throw new Error(`Unsupported ripple tx type ${tx.type}`)
    }
    const { specification, outcome } = tx as FormattedPaymentTransaction
    const { source, destination } = specification
    const amountObject = ((source as any).maxAmount || source.amount) as Amount
    if (amountObject.currency !== 'XRP') {
      throw new Error(`Unsupported ripple tx currency ${amountObject.currency}`)
    }
    const fromIndex = this.resolveIndexFromAdjustment(source)
    const toIndex = this.resolveIndexFromAdjustment(destination)
    const amount = amountObject.value
    const status = outcome.result.startsWith('tes') ? TransactionStatus.Confirmed : TransactionStatus.Failed
    const confirmationNumber = outcome.ledgerVersion
    const ledger = await this.retryDced(() => this.rippleApi.getLedger({ ledgerVersion: confirmationNumber }))
    const currentLedgerVersion = await this.retryDced(() => this.rippleApi.getLedgerVersion())
    const confirmationId = ledger.ledgerHash
    const confirmationTimestamp = outcome.timestamp ? new Date(outcome.timestamp) : null
    return {
      status,
      id: tx.id,
      fromIndex,
      fromAddress: source.address,
      fromExtraId: typeof source.tag !== 'undefined' ? String(source.tag) : null,
      toIndex,
      toAddress: destination.address,
      toExtraId: typeof destination.tag !== 'undefined' ? String(destination.tag) : null,
      amount: amount,
      fee: outcome.fee,
      sequenceNumber: tx.sequence,
      confirmationId,
      confirmationNumber: ledger.ledgerVersion,
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
      feeMain = await this.retryDced(() => this.rippleApi.getFee(cushion))
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

  private async resolvePayportBalance(
    fromPayport: Payport,
    options: RippleCreateTransactionOptions,
  ): Promise<BigNumber> {
    if (isNil(fromPayport.extraId)) {
      const balances = await this.getBalance(fromPayport)
      return new BigNumber(balances.confirmedBalance)
    }
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
    fromTo: FromTo,
    feeOption: ResolvedFeeOption,
    amount: BigNumber,
    payportBalance: BigNumber,
    options: RippleCreateTransactionOptions,
  ): Promise<RippleUnsignedTransaction> {
    if (amount.isNaN() || amount.lte(0)) {
      throw new Error(`Invalid amount provided to ripple-payments createTransaction: ${amount}`)
    }
    const { fromIndex, fromAddress, fromExtraId, fromPayport, toIndex, toAddress, toExtraId } = fromTo
    if (fromAddress === toAddress) {
      throw new Error('Cannot create XRP payment transaction sending XRP to self')
    }
    const { targetFeeLevel, targetFeeRate, targetFeeRateType, feeMain } = feeOption
    const { sequenceNumber } = options
    const maxLedgerVersionOffset =
      options.maxLedgerVersionOffset || this.config.maxLedgerVersionOffset || DEFAULT_MAX_LEDGER_VERSION_OFFSET
    const amountString = amount.toString()
    const addressBalances = await this.getBalance({ address: fromAddress })
    const addressBalance = new BigNumber(addressBalances.confirmedBalance)
    const actualBalance = addressBalance.plus(MIN_BALANCE)
    if (addressBalance.lt(0)) {
      throw new Error(
        `Cannot send from ripple address that has less than ${MIN_BALANCE} XRP: ${fromAddress} (${actualBalance} XRP)`,
      )
    }
    const totalValue = amount.plus(feeMain)
    if (addressBalance.minus(totalValue).lt(0)) {
      throw new Error(
        `Cannot send ${amountString} XRP with fee of ${feeMain} XRP because it would reduce the balance below ` +
          `the minimum required balance of ${MIN_BALANCE} XRP: ${fromAddress} (${actualBalance} XRP)`,
      )
    }
    if (typeof fromExtraId === 'string' && totalValue.gt(payportBalance)) {
      throw new Error(
        `Insufficient payport balance of ${payportBalance} XRP to send ${amountString} XRP ` +
          `with fee of ${feeMain} XRP: ${serializePayport(fromPayport)}`,
      )
    }
    const preparedTx = await this.retryDced(() =>
      this.rippleApi.preparePayment(
        fromAddress,
        {
          source: {
            address: fromAddress,
            tag: extraIdToTag(fromExtraId),
            maxAmount: {
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
          sequence: sequenceNumber,
        },
      ),
    )
    return {
      status: TransactionStatus.Unsigned,
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
      sequenceNumber: preparedTx.instructions.sequence,
      data: preparedTx,
    }
  }

  async createTransaction(
    from: number,
    to: ResolveablePayport,
    amount: string,
    options: RippleCreateTransactionOptions = DEFAULT_CREATE_TRANSACTION_OPTIONS,
  ): Promise<RippleUnsignedTransaction> {
    const fromTo = await this.resolveFromTo(from, to)
    const feeOption = await this.resolveFeeOption(options)
    const payportBalance = await this.resolvePayportBalance(fromTo.fromPayport, options)
    const amountBn = new BigNumber(amount)
    return this.doCreateTransaction(fromTo, feeOption, amountBn, payportBalance, options)
  }

  async createSweepTransaction(
    from: number,
    to: ResolveablePayport,
    options: RippleCreateTransactionOptions = DEFAULT_CREATE_TRANSACTION_OPTIONS,
  ): Promise<RippleUnsignedTransaction> {
    const fromTo = await this.resolveFromTo(from, to)
    const feeOption = await this.resolveFeeOption(options)
    const payportBalance = await this.resolvePayportBalance(fromTo.fromPayport, options)
    let amountBn = payportBalance.minus(feeOption.feeMain)
    if (amountBn.lt(0)) {
      const fromPayport = { address: fromTo.fromAddress, extraId: fromTo.fromExtraId }
      throw new Error(
        `Insufficient balance to sweep from ripple payport with fee of ${feeOption.feeMain} XRP: ` +
          `${serializePayport(fromPayport)} (${payportBalance} XRP)`,
      )
    }
    return this.doCreateTransaction(fromTo, feeOption, amountBn, payportBalance, options)
  }

  async signTransaction(unsignedTx: RippleUnsignedTransaction): Promise<RippleSignedTransaction> {
    assertType(RippleUnsignedTransaction, unsignedTx)
    if (this.isReadOnly()) {
      throw new Error('Cannot sign transaction with read only ripple payments (no xprv or secrets provided)')
    }
    this.logger.debug('signTransaction', unsignedTx.data)
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
      status: TransactionStatus.Signed,
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
    const result = (await this.retryDced(() => this.rippleApi.submit(signedTxString))) as any
    this.logger.debug('broadcasted', result)
    const resultCode = result.engine_result || result.resultCode || ''
    if (!resultCode.startsWith('tes')) {
      throw new Error(`Failed to broadcast ripple tx ${signedTx.id} with result code ${resultCode}`)
    }
    return {
      id: signedTx.id,
      rebroadcast,
      data: result,
    }
  }
}
