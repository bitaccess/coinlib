import {
  BasePayments,
  BalanceResult,
  FeeOption,
  ResolvedFeeOption,
  FromTo,
  Payport,
  FeeLevel,
  FeeRateType,
  TransactionStatus,
  ResolveablePayport,
  PaymentsError,
  PaymentsErrorCode,
  isMatchingError,
  FeeOptionCustom,
  PayportOutput,
  CreateTransactionOptions
} from '@faast/payments-common'
import { assertType, isNil, Numeric, isUndefined } from '@faast/ts-common'
import BigNumber from 'bignumber.js'
import { FormattedPaymentTransaction, Prepare } from 'ripple-lib/dist/npm/transaction/types'
import { Adjustment, Amount } from 'ripple-lib/dist/npm/common/types/objects'
import { omit } from 'lodash'

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
  DEFAULT_FEE_LEVEL,
  PUBLIC_CONFIG_OMIT_FIELDS,
} from './constants'
import { assertValidAddress, assertValidExtraIdOrNil, toBaseDenominationBigNumber } from './helpers'

function extraIdToTag(extraId: string | null | undefined): number | undefined {
  return isNil(extraId) ? undefined : Number.parseInt(extraId)
}
function serializePayport(payport: Payport): string {
  return isNil(payport.extraId) ? payport.address : `${payport.address}/${payport.extraId}`
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

  constructor(public config: Config) {
    super(config)
  }

  getFullConfig() {
    return this.config
  }

  getPublicConfig() {
    return {
      ...omit(this.config, PUBLIC_CONFIG_OMIT_FIELDS),
      ...this.getPublicAccountConfig(),
    }
  }

  abstract getPublicAccountConfig(): Config

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
   * @deprecated use createServiceTransaction instead
   */
  async initAccounts() {}

  async getBalance(payportOrIndex: ResolveablePayport): Promise<BalanceResult> {
    const payport = await this.resolvePayport(payportOrIndex)
    const { address, extraId } = payport
    if (!isNil(extraId)) {
      throw new Error(`Cannot getBalance of ripple payport with extraId ${extraId}, use BalanceMonitor instead`)
    }
    let balances
    try {
      balances = await this._retryDced(() => this.api.getBalances(address))
    } catch (e) {
      if (isMatchingError(e, NOT_FOUND_ERRORS)) {
        this.logger.debug(`Address ${address} not found`)
        return {
          confirmedBalance: '0',
          unconfirmedBalance: '0',
          spendableBalance: '0',
          sweepable: false,
          requiresActivation: true,
          minimumBalance: String(MIN_BALANCE),
        }
      }
      throw e
    }
    this.logger.debug(`rippleApi.getBalance ${address}`, balances)
    const xrpBalance = balances.find(({ currency }) => currency === 'XRP')
    const xrpAmount = xrpBalance && xrpBalance.value ? xrpBalance.value : '0'
    const confirmedBalance = new BigNumber(xrpAmount)
    const spendableBalance = BigNumber.max(0, confirmedBalance.minus(MIN_BALANCE))
    return {
      confirmedBalance: confirmedBalance.toString(),
      unconfirmedBalance: '0',
      spendableBalance: spendableBalance.toString(),
      sweepable: this.isSweepableAddressBalance(xrpAmount),
      requiresActivation: confirmedBalance.lt(MIN_BALANCE),
      minimumBalance: String(MIN_BALANCE),
    }
  }

  usesUtxos() {
    return false
  }

  async getUtxos() {
    return []
  }

  usesSequenceNumber() {
    return true
  }

  async getNextSequenceNumber(payportOrIndex: ResolveablePayport): Promise<string> {
    const payport = await this.resolvePayport(payportOrIndex)
    const { address } = payport
    const accountInfo = await this._retryDced(() => this.api.getAccountInfo(address))
    return new BigNumber(accountInfo.sequence).toString()
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
      tx = await this._retryDced(() => this.api.getTransaction(txId))
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
    const isSuccessful = outcome.result.startsWith('tes')
    const isCostDestroyed = outcome.result.startsWith('tec')
    const status = isSuccessful || isCostDestroyed ? TransactionStatus.Confirmed : TransactionStatus.Failed
    const isExecuted = isSuccessful
    const confirmationNumber = outcome.ledgerVersion
    const ledger = await this._retryDced(() => this.api.getLedger({ ledgerVersion: confirmationNumber }))
    const currentLedgerVersion = await this._retryDced(() => this.api.getLedgerVersion())
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
      sequenceNumber: String(tx.sequence),
      confirmationId,
      confirmationNumber: String(confirmationNumber),
      confirmationTimestamp,
      isExecuted,
      isConfirmed: Boolean(confirmationNumber),
      confirmations: currentLedgerVersion - confirmationNumber,
      data: tx,
    }
  }

  async resolveFeeOption(feeOption: FeeOption): Promise<ResolvedFeeOption> {
    let targetFeeLevel: FeeLevel
    let targetFeeRate: string
    let targetFeeRateType: FeeRateType
    let feeMain: string
    let feeBase: string
    if (FeeOptionCustom.is(feeOption)) {
      targetFeeLevel = feeOption.feeLevel || FeeLevel.Custom
      targetFeeRate = feeOption.feeRate
      targetFeeRateType = feeOption.feeRateType
    } else {
      targetFeeLevel = feeOption.feeLevel || DEFAULT_FEE_LEVEL
      const { feeRate, feeRateType } = await this.getFeeRateRecommendation(targetFeeLevel)
      targetFeeRate = feeRate
      targetFeeRateType = feeRateType
    }
    if (targetFeeRateType === FeeRateType.Base) {
      feeBase = targetFeeRate
      feeMain = this.toMainDenomination(feeBase)
    } else if (targetFeeRateType === FeeRateType.Main) {
      feeMain = targetFeeRate
      feeBase = this.toBaseDenomination(feeMain)
    } else {
      throw new Error(`Unsupported ripple feeRateType ${targetFeeRateType}`)
    }
    return {
      targetFeeLevel,
      targetFeeRate,
      targetFeeRateType,
      feeMain,
      feeBase,
    }
  }

  private async resolvePayportSpendableBalance(
    fromPayport: Payport,
    options: RippleCreateTransactionOptions,
  ): Promise<BigNumber> {
    if (isNil(fromPayport.extraId)) {
      const balances = await this.getBalance(fromPayport)
      return new BigNumber(balances.spendableBalance)
    }
    if (typeof options.payportBalance !== 'string') {
      throw new Error('ripple-payments create transaction options requires payportBalance when payport extraId is nil')
    }
    const payportBalance = new BigNumber(options.payportBalance)
    if (payportBalance.isNaN()) {
      throw new Error(`Invalid NaN payportBalance option provided: ${options.payportBalance}`)
    }
    return payportBalance
  }

  private async assertSufficientAddressBalance(address: string, amount: string, feeMain: string) {
    const {
      requiresActivation,
      confirmedBalance,
    } = await this.getBalance({ address })
    if (requiresActivation) {
      throw new Error(
        `Cannot send from unactivated ripple address ${address} - min balance of `
          + `${MIN_BALANCE} XRP required (${confirmedBalance} XRP)`,
      )
    }

    const balanceAfterTx = new BigNumber(confirmedBalance).minus(amount).minus(feeMain)
    if (balanceAfterTx.lt(MIN_BALANCE)) {
      const reason = balanceAfterTx.lt(0)
        ? 'due to insufficient balance'
        : `because it would reduce the balance below the ${MIN_BALANCE} XRP minimum`
      throw new Error(
        `Cannot send ${amount} XRP with fee of ${feeMain} XRP from ${address} `
          + `${reason} (${confirmedBalance} XRP)`,
      )
    }
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

    await this.assertSufficientAddressBalance(fromAddress, amountString, feeMain)

    const totalValue = amount.plus(feeMain)
    if (typeof fromExtraId === 'string' && totalValue.gt(payportBalance)) {
      throw new Error(
        `Insufficient payport balance of ${payportBalance} XRP to send ${amountString} XRP ` +
          `with fee of ${feeMain} XRP from ${serializePayport(fromPayport)}`,
      )
    }
    const {
      requiresActivation: toAddressRequiresActivation,
      confirmedBalance: toAddressBalance,
    } = await this.getBalance({ address: toAddress })
    if (toAddressRequiresActivation && amount.lt(MIN_BALANCE)) {
      throw new Error(
        `Cannot send ${amountString} XRP to recipient ${toAddress} because address requires `
          + `a balance of at least ${MIN_BALANCE} XRP to receive funds (${toAddressBalance} XRP)`
      )
    }
    const preparedTx = await this._retryDced(() =>
      this.api.preparePayment(
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
          fee: feeMain,
          maxLedgerVersionOffset,
          sequence: isUndefined(sequenceNumber) ? sequenceNumber : new BigNumber(sequenceNumber).toNumber(),
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
      sequenceNumber: String(preparedTx.instructions.sequence),
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
    const payportBalance = await this.resolvePayportSpendableBalance(fromTo.fromPayport, options)
    const amountBn = new BigNumber(amount)
    return this.doCreateTransaction(fromTo, feeOption, amountBn, payportBalance, options)
  }

  async createServiceTransaction(
    from: number,
    options: RippleCreateTransactionOptions = DEFAULT_CREATE_TRANSACTION_OPTIONS,
  ): Promise<RippleUnsignedTransaction> {
    const { address } = await this.getPayport(from)
    const settings = await this.api.getSettings(address)
    if (settings.requireDestinationTag) {
      throw new Error(`Ripple require destination tag setting already enabled on ${address}`)
    }
    const { targetFeeLevel, targetFeeRate, targetFeeRateType, feeMain } = await this.resolveFeeOption(options)
    await this.assertSufficientAddressBalance(address, '0', feeMain)

    const { sequenceNumber } = options
    const maxLedgerVersionOffset =
      options.maxLedgerVersionOffset || this.config.maxLedgerVersionOffset || DEFAULT_MAX_LEDGER_VERSION_OFFSET

    const preparedTx = await this._retryDced(() =>
      this.api.prepareSettings(
        address,
        {
          requireDestinationTag: true,
        },
        {
          fee: feeMain,
          maxLedgerVersionOffset,
          sequence: isUndefined(sequenceNumber) ? sequenceNumber : new BigNumber(sequenceNumber).toNumber(),
        }
      ),
    )
    return {
      status: TransactionStatus.Unsigned,
      id: null,
      fromIndex: from,
      fromAddress: address,
      fromExtraId: null,
      toIndex: null,
      toAddress: '',
      toExtraId: null,
      amount: '',
      targetFeeLevel,
      targetFeeRate,
      targetFeeRateType,
      fee: feeMain,
      sequenceNumber: String(preparedTx.instructions.sequence),
      data: preparedTx,
    }
  }

  async createSweepTransaction(
    from: number,
    to: ResolveablePayport,
    options: RippleCreateTransactionOptions = DEFAULT_CREATE_TRANSACTION_OPTIONS,
  ): Promise<RippleUnsignedTransaction> {
    const fromTo = await this.resolveFromTo(from, to)
    const feeOption = await this.resolveFeeOption(options)
    const payportBalance = await this.resolvePayportSpendableBalance(fromTo.fromPayport, options)
    let amountBn = payportBalance.minus(feeOption.feeMain)
    if (amountBn.lt(0)) {
      const fromPayport = { address: fromTo.fromAddress, extraId: fromTo.fromExtraId }
      throw new Error(
        `Insufficient balance to sweep with fee of ${feeOption.feeMain} XRP from ripple payport ` +
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
    const signResult = this.api.sign(txJSON, secret)
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
    const result = (await this._retryDced(() => this.api.submit(signedTxString, true))) as any
    this.logger.debug('broadcasted', result)
    const resultCode = result.engine_result || result.resultCode || ''
    if (resultCode === 'terPRE_SEQ') {
      throw new PaymentsError(PaymentsErrorCode.TxSequenceTooHigh, resultCode)
    }
    if (!rebroadcast) {
      // Sometimes these errors come up even after tx is confirmed
      if (resultCode === 'tefPAST_SEQ') {
        throw new PaymentsError(PaymentsErrorCode.TxSequenceCollision, resultCode)
      }
      if (resultCode === 'tefMAX_LEDGER') {
        throw new PaymentsError(PaymentsErrorCode.TxExpired, resultCode)
      }
    }
    const okay =
      resultCode.startsWith('tes') || // successful
      resultCode.startsWith('ter') || // retryable
      resultCode.startsWith('tec') || // not executed, but fee lost
      resultCode === 'tefPAST_SEQ' || // handled above
      resultCode === 'tefMAX_LEDGER' // handled above
    if (!okay) {
      throw new Error(`Failed to broadcast ripple tx ${signedTx.id} with result code ${resultCode}`)
    }
    return {
      id: signedTx.id,
      rebroadcast,
      data: result,
    }
  }

  async createMultiOutputTransaction(
    from: number,
    to: PayportOutput[],
    options: CreateTransactionOptions = {},
  ): Promise<null> {
    return null
  }
}
