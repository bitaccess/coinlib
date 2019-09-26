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
} from '@faast/payments-common'
import { assertType, isNil, Numeric } from '@faast/ts-common'
import BigNumber from 'bignumber.js'
import { omit } from 'lodash'

import {
  BaseStellarPaymentsConfig,
  StellarUnsignedTransaction,
  StellarSignedTransaction,
  StellarBroadcastResult,
  StellarTransactionInfo,
  StellarCreateTransactionOptions,
  FromToWithPayport,
  StellarSignatory,
} from './types'
import { StellarPaymentsUtils } from './StellarPaymentsUtil'
import {
  DEFAULT_CREATE_TRANSACTION_OPTIONS,
  MIN_BALANCE,
  DEFAULT_MAX_LEDGER_VERSION_OFFSET,
  NOT_FOUND_ERRORS,
} from './constants'
import { assertValidAddress, assertValidExtraIdOrNil, toBaseDenominationBigNumber } from './helpers'

function extraIdToTag(extraId: string | null | undefined): number | undefined {
  return isNil(extraId) ? undefined : Number.parseInt(extraId)
}
function serializePayport(payport: Payport): string {
  return isNil(payport.extraId) ? payport.address : `${payport.address}/${payport.extraId}`
}

export abstract class BaseStellarPayments<Config extends BaseStellarPaymentsConfig> extends StellarPaymentsUtils
  implements
    BasePayments<
      Config,
      StellarUnsignedTransaction,
      StellarSignedTransaction,
      StellarBroadcastResult,
      StellarTransactionInfo
    > {
  constructor(public config: Config) {
    super(config)
  }

  getFullConfig() {
    return this.config
  }

  getPublicConfig() {
    return {
      ...omit(this.config, ['logger', 'server']),
      ...this.getPublicAccountConfig(),
    }
  }

  abstract getPublicAccountConfig(): Config

  abstract getAccountIds(): string[]

  abstract getAccountId(index: number): string

  abstract getHotSignatory(): StellarSignatory

  abstract getDepositSignatory(): StellarSignatory

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
    const settings = await this.stellarApi.getSettings(address)
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
    const unsignedTx = await this._retryDced(() =>
      this.stellarApi.prepareSettings(address, {
        requireDestinationTag: true,
      }),
    )
    const signedTx = this.stellarApi.sign(unsignedTx.txJSON, secret)
    const broadcast = await this._retryDced(() => this.stellarApi.submit(signedTx.signedTransaction))
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
      throw new Error(`Cannot getBalance of stellar payport with extraId ${extraId}, use BalanceMonitor instead`)
    }
    const balances = await this._retryDced(() => this.stellarApi.getBalances(address))
    this.logger.debug(`stellarApi.getBalance ${address}`, balances)
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
    const accountInfo = await this._retryDced(() => this.stellarApi.getAccountInfo(address))
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

  async getTransactionInfo(txId: string): Promise<StellarTransactionInfo> {
    let tx
    try {
      tx = await this._retryDced(() => this.stellarApi.getTransaction(txId))
    } catch (e) {
      const eString = e.toString()
      if (NOT_FOUND_ERRORS.some(type => eString.includes(type))) {
        throw new Error(`Transaction not found: ${eString}`)
      }
      throw e
    }
    this.logger.debug('getTransaction', txId, tx)
    if (tx.type !== 'payment') {
      throw new Error(`Unsupported stellar tx type ${tx.type}`)
    }
    const { specification, outcome } = tx as FormattedPaymentTransaction
    const { source, destination } = specification
    const amountObject = ((source as any).maxAmount || source.amount) as Amount
    if (amountObject.currency !== 'XRP') {
      throw new Error(`Unsupported stellar tx currency ${amountObject.currency}`)
    }
    const fromIndex = this.resolveIndexFromAdjustment(source)
    const toIndex = this.resolveIndexFromAdjustment(destination)
    const amount = amountObject.value
    const isSuccessful = outcome.result.startsWith('tes')
    const isCostDestroyed = outcome.result.startsWith('tec')
    const status = isSuccessful || isCostDestroyed ? TransactionStatus.Confirmed : TransactionStatus.Failed
    const isExecuted = isSuccessful
    const confirmationNumber = outcome.ledgerVersion
    const ledger = await this._retryDced(() => this.stellarApi.getLedger({ ledgerVersion: confirmationNumber }))
    const currentLedgerVersion = await this._retryDced(() => this.stellarApi.getLedgerVersion())
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
      confirmationNumber,
      confirmationTimestamp,
      isExecuted,
      isConfirmed: Boolean(confirmationNumber),
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
        throw new Error(`Unsupport stellar feeRateType ${feeOption.feeRateType}`)
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
      feeMain = await this._retryDced(() => this.stellarApi.getFee(cushion))
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
    options: StellarCreateTransactionOptions,
  ): Promise<BigNumber> {
    if (isNil(fromPayport.extraId)) {
      const balances = await this.getBalance(fromPayport)
      return new BigNumber(balances.confirmedBalance)
    }
    if (typeof options.payportBalance !== 'string') {
      throw new Error('stellar-payments createSweepTransaction missing required payportBalance option')
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
    options: StellarCreateTransactionOptions,
  ): Promise<StellarUnsignedTransaction> {
    if (amount.isNaN() || amount.lte(0)) {
      throw new Error(`Invalid amount provided to stellar-payments createTransaction: ${amount}`)
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
        `Cannot send from stellar address that has less than ${MIN_BALANCE} XRP: ${fromAddress} (${actualBalance} XRP)`,
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
    const preparedTx = await this._retryDced(() =>
      this.stellarApi.preparePayment(
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
    options: StellarCreateTransactionOptions = DEFAULT_CREATE_TRANSACTION_OPTIONS,
  ): Promise<StellarUnsignedTransaction> {
    const fromTo = await this.resolveFromTo(from, to)
    const feeOption = await this.resolveFeeOption(options)
    const payportBalance = await this.resolvePayportBalance(fromTo.fromPayport, options)
    const amountBn = new BigNumber(amount)
    return this.doCreateTransaction(fromTo, feeOption, amountBn, payportBalance, options)
  }

  async createSweepTransaction(
    from: number,
    to: ResolveablePayport,
    options: StellarCreateTransactionOptions = DEFAULT_CREATE_TRANSACTION_OPTIONS,
  ): Promise<StellarUnsignedTransaction> {
    const fromTo = await this.resolveFromTo(from, to)
    const feeOption = await this.resolveFeeOption(options)
    const payportBalance = await this.resolvePayportBalance(fromTo.fromPayport, options)
    let amountBn = payportBalance.minus(feeOption.feeMain)
    if (amountBn.lt(0)) {
      const fromPayport = { address: fromTo.fromAddress, extraId: fromTo.fromExtraId }
      throw new Error(
        `Insufficient balance to sweep from stellar payport with fee of ${feeOption.feeMain} XRP: ` +
          `${serializePayport(fromPayport)} (${payportBalance} XRP)`,
      )
    }
    return this.doCreateTransaction(fromTo, feeOption, amountBn, payportBalance, options)
  }

  async signTransaction(unsignedTx: StellarUnsignedTransaction): Promise<StellarSignedTransaction> {
    assertType(StellarUnsignedTransaction, unsignedTx)
    if (this.isReadOnly()) {
      throw new Error('Cannot sign transaction with read only stellar payments (no xprv or secrets provided)')
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
      throw new Error(`Cannot sign stellar transaction from address ${unsignedTx.fromAddress}`)
    }
    const signResult = this.stellarApi.sign(txJSON, secret)
    return {
      ...unsignedTx,
      id: signResult.id,
      data: signResult,
      status: TransactionStatus.Signed,
    }
  }

  async broadcastTransaction(signedTx: StellarSignedTransaction): Promise<StellarBroadcastResult> {
    assertType(StellarSignedTransaction, signedTx)
    const signedTxString = (signedTx.data as any).signedTransaction as string
    let rebroadcast: boolean = false
    try {
      const existing = await this.getTransactionInfo(signedTx.id)
      rebroadcast = existing.id === signedTx.id
    } catch (e) {}
    const result = (await this._retryDced(() => this.stellarApi.submit(signedTxString))) as any
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
      throw new Error(`Failed to broadcast stellar tx ${signedTx.id} with result code ${resultCode}`)
    }
    return {
      id: signedTx.id,
      rebroadcast,
      data: result,
    }
  }
}
