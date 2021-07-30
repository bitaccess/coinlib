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
  DerivablePayport,
  PaymentsError,
  PaymentsErrorCode,
  NetworkType,
  PayportOutput,
  CreateTransactionOptions,
  FeeOptionCustom,
} from '@bitaccess/coinlib-common'
import { assertType, isNil, Numeric, isString, toBigNumber, isObject } from '@faast/ts-common'
import BigNumber from 'bignumber.js'
import { omit } from 'lodash'
import * as Stellar from 'stellar-sdk'

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
  NOT_FOUND_ERRORS,
  DEFAULT_TX_TIMEOUT_SECONDS,
  DEFAULT_FEE_LEVEL,
  PUBLIC_CONFIG_OMIT_FIELDS,
} from './constants'
import { assertValidAddress, assertValidExtraIdOrNil, toBaseDenominationBigNumber } from './helpers'
import { serializePayport, omitHidden, isMatchingError } from './utils'

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
      ...omit(this.config, PUBLIC_CONFIG_OMIT_FIELDS),
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
    } else if (Payport.is(payport)) {
      assertValidAddress(payport.address)
      assertValidExtraIdOrNil(payport.extraId)
      return payport
    }
    throw new Error(`Invalid Stellar payport: ${JSON.stringify(payport)}`)
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

  isSweepableBalance(balance: Numeric, payport?: ResolveablePayport): boolean {
    if (payport && this.doResolvePayport(payport).extraId) {
      return new BigNumber(balance).gt(0)
    }
    return this.isAddressBalanceSweepable(balance)
  }

  async getBalance(payportOrIndex: ResolveablePayport): Promise<BalanceResult> {
    const payport = await this.resolvePayport(payportOrIndex)
    const { address, extraId } = payport
    if (!isNil(extraId)) {
      throw new Error(`Cannot getBalance of stellar payport with extraId ${extraId}, use BalanceMonitor instead`)
    }
    return this.getAddressBalance(address)
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
    return this.getAddressNextSequenceNumber(payport.address)
  }

  resolveIndexFromAddressAndMemo(address: string, memo?: string): number | null {
    if (address === this.getHotSignatory().address) {
      return 0
    } else if (address === this.getDepositSignatory().address) {
      if (memo) {
        const index = Number.parseInt(memo)
        if (!Number.isNaN(index)) {
          return index
        }
      }
      return 1
    }
    return null
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
      throw new Error(`Unsupported ${this.coinSymbol} feeRateType ${targetFeeRateType}`)
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
    options: StellarCreateTransactionOptions,
  ): Promise<BigNumber> {
    if (isNil(fromPayport.extraId)) {
      const balances = await this.getBalance(fromPayport)
      return new BigNumber(balances.spendableBalance)
    }
    if (typeof options.payportBalance !== 'string') {
      throw new Error('stellar-payments create transaction options requires payportBalance when payport extraId is nil')
    }
    const payportBalance = new BigNumber(options.payportBalance)
    if (payportBalance.isNaN()) {
      throw new Error(`Invalid NaN payportBalance option provided: ${options.payportBalance}`)
    }
    return payportBalance
  }

  private getStellarNetwork() {
    return this.networkType === NetworkType.Testnet
      ? Stellar.Networks.TESTNET
      : Stellar.Networks.PUBLIC
  }

  private serializeTransaction(tx: Stellar.Transaction): { serializedTx: string } {
    const xdr = tx.toEnvelope().toXDR('base64')
    return {
      serializedTx: xdr.toString()
    }
  }

  private deserializeTransaction(txData: object): Stellar.Transaction {
    return new Stellar.Transaction((txData as any).serializedTx, this.getStellarNetwork())
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
      throw new Error('Cannot create XLM payment transaction sending XLM to self')
    }
    const { targetFeeLevel, targetFeeRate, targetFeeRateType, feeBase, feeMain } = feeOption
    const seqNo = options.sequenceNumber
    const sequenceNumber = toBigNumber(seqNo)
    const txTimeoutSecs = options.timeoutSeconds || this.config.txTimeoutSeconds || DEFAULT_TX_TIMEOUT_SECONDS
    const amountString = amount.toString()
    const {
      requiresActivation: fromAddressRequiresActivation,
      confirmedBalance: fromAddressBalance,
    } = await this.getBalance({ address: fromAddress })
    if (fromAddressRequiresActivation) {
      throw new Error(
        `Cannot send from unactivated stellar address ${fromAddress} - min balance of `
          + `${MIN_BALANCE} XLM required (${fromAddressBalance} XLM)`,
      )
    }
    const totalValue = amount.plus(feeMain)
    const balanceAfterTx = new BigNumber(fromAddressBalance).minus(totalValue)
    if (balanceAfterTx.lt(MIN_BALANCE)) {
      const reason = balanceAfterTx.lt(0)
        ? 'due to insufficient balance'
        : `because it would reduce the balance below the ${MIN_BALANCE} XLM minimum`
      throw new Error(
        `Cannot send ${amountString} XLM with fee of ${feeMain} XLM from ${fromAddress} `
          + `${reason} (${fromAddressBalance} XLM)`,
      )
    }
    if (typeof fromExtraId === 'string' && totalValue.gt(payportBalance)) {
      throw new Error(
        `Insufficient payport balance of ${payportBalance} XLM to send ${amountString} XLM ` +
          `with fee of ${feeMain} XLM from ${serializePayport(fromPayport)}`,
      )
    }
    const {
      requiresActivation: toAddressRequiresActivation,
      confirmedBalance: toAddressBalance,
    } = await this.getBalance({ address: toAddress })
    if (toAddressRequiresActivation && amount.lt(MIN_BALANCE)) {
      throw new Error(
        `Cannot send ${amountString} XLM to recipient ${toAddress} because address requires `
          + `a balance of at least ${MIN_BALANCE} XLM to receive funds (${toAddressBalance} XLM)`
      )
    }
    const fromAccount = await this.loadAccountOrThrow(fromAddress)

    let sourceAccount: Stellar.Account = fromAccount
    if (sequenceNumber) {
      // Stellar creates txs with account sequence + 1, so we must subtract sequenceNumber option first
      sourceAccount = new Stellar.Account(fromAddress, sequenceNumber.minus(1).toString())
    }

    const toAccount = await this.loadAccount(toAddress)

    const operation = toAccount === null
      ? Stellar.Operation.createAccount({
          destination: toAddress,
          startingBalance: amount.toString(),
        })
      : Stellar.Operation.payment({
          destination: toAddress,
          asset: Stellar.Asset.native(),
          amount: amount.toString(),
        })

    const preparedTx = new Stellar.TransactionBuilder(sourceAccount, {
        fee: Number.parseInt(feeBase),
        networkPassphrase: this.getStellarNetwork(),
        memo: toExtraId ? Stellar.Memo.text(toExtraId) : undefined,
      })
      .addOperation(operation)
      .setTimeout(txTimeoutSecs)
      .build()
    const txData = this.serializeTransaction(preparedTx)
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
      sequenceNumber: preparedTx.sequence,
      data: txData,
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
    const payportBalance = await this.resolvePayportSpendableBalance(fromTo.fromPayport, options)
    const amountBn = new BigNumber(amount)
    return this.doCreateTransaction(fromTo, feeOption, amountBn, payportBalance, options)
  }

  async createServiceTransaction(): Promise<null> {
    return null
  }

  async createSweepTransaction(
    from: number,
    to: ResolveablePayport,
    options: StellarCreateTransactionOptions = DEFAULT_CREATE_TRANSACTION_OPTIONS,
  ): Promise<StellarUnsignedTransaction> {
    const fromTo = await this.resolveFromTo(from, to)
    const feeOption = await this.resolveFeeOption(options)
    const payportBalance = await this.resolvePayportSpendableBalance(fromTo.fromPayport, options)
    let amountBn = payportBalance.minus(feeOption.feeMain)
    if (amountBn.lt(0)) {
      const fromPayport = { address: fromTo.fromAddress, extraId: fromTo.fromExtraId }
      throw new Error(
        `Insufficient balance to sweep from stellar payport with fee of ${feeOption.feeMain} XLM: ` +
          `${serializePayport(fromPayport)} (${payportBalance} XLM)`,
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
    const preparedTx = this.deserializeTransaction(unsignedTx.data)
    let secret: string | Stellar.Keypair
    const hotSignatory = this.getHotSignatory()
    const depositSignatory = this.getDepositSignatory()
    if (unsignedTx.fromAddress === hotSignatory.address) {
      secret = hotSignatory.secret
    } else if (unsignedTx.fromAddress === depositSignatory.address) {
      secret = depositSignatory.secret
    } else {
      throw new Error(`Cannot sign stellar transaction from address ${unsignedTx.fromAddress}`)
    }
    const keypair = isString(secret) ? Stellar.Keypair.fromSecret(secret) : secret
    preparedTx.sign(keypair)
    const signedData = this.serializeTransaction(preparedTx)
    return {
      ...unsignedTx,
      id: '',
      data: signedData,
      status: TransactionStatus.Signed,
    }
  }

  async broadcastTransaction(signedTx: StellarSignedTransaction): Promise<StellarBroadcastResult> {
    assertType(StellarSignedTransaction, signedTx)
    const preparedTx = this.deserializeTransaction(signedTx.data)
    let rebroadcast: boolean = false
    try {
      const existing = await this.getTransactionInfo(signedTx.id)
      rebroadcast = existing.id === signedTx.id
    } catch (e) {}
    let result: Stellar.Horizon.SubmitTransactionResponse
    try {
      result = await this._retryDced(() => this.getApi().submitTransaction(preparedTx))
    } catch (e) {
      if (isMatchingError(e, ['tx_too_late'])) {
        throw new PaymentsError(PaymentsErrorCode.TxExpired, 'Transaction has expired (tx_too_late)')
      }
      if (isMatchingError(e, ['Request failed with status code'])) {
        throw new Error(`submitTransaction failed: ${e.message} -- ${JSON.stringify((e.response || {}).data)}`)
      }
      throw e
    }
    this.logger.debug('broadcasted', omitHidden(result))
    return {
      id: result.hash,
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

  async createMultiInputTransaction(
    from: number[],
    to: PayportOutput[],
    options: CreateTransactionOptions = {},
  ): Promise<null> {
    return null
  }
}
