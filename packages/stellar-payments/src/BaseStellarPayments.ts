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
  NetworkType,
} from '@faast/payments-common'
import { assertType, isNil, Numeric, isString, toBigNumber, isObject } from '@faast/ts-common'
import BigNumber from 'bignumber.js'
import { omit, omitBy } from 'lodash'
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
  BASE_UNITS,
  DEFAULT_TX_TIMEOUT_SECONDS,
  DEFAULT_FEE_LEVEL,
} from './constants'
import { assertValidAddress, assertValidExtraIdOrNil, toBaseDenominationBigNumber } from './helpers'
import { isStellarTransaction, serializePayport, omitHidden, isMatchingError, isStellarTransactionRecord } from './utils';
import { isFunction } from 'util'

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
      ...omit(this.config, ['logger', 'server', 'hdKey']),
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
  async loadAccount(address: string) {
    let accountInfo
    try {
      accountInfo = await this._retryDced(() => this.getApi().loadAccount(address))
    } catch (e) {
      if (isMatchingError(e, NOT_FOUND_ERRORS)) {
        this.logger.debug(`Address ${address} not found`)
        return null
      }
      throw e
    }
    // this.logger.debug(`api.loadAccount ${address}`, omitHidden(accountInfo))
    return accountInfo
  }

  async loadAccountOrThrow(address: string) {
    const accountInfo = await this.loadAccount(address)
    if (accountInfo === null) {
      throw new Error(`Account not found ${address}`)
    }
    return accountInfo
  }

  async getBalance(payportOrIndex: ResolveablePayport): Promise<BalanceResult> {
    const payport = await this.resolvePayport(payportOrIndex)
    const { address, extraId } = payport
    if (!isNil(extraId)) {
      throw new Error(`Cannot getBalance of stellar payport with extraId ${extraId}, use BalanceMonitor instead`)
    }
    const accountInfo = await this.loadAccount(address)
    if (accountInfo === null) {
      return {
        confirmedBalance: '0',
        unconfirmedBalance: '0',
        spendableBalance: '0',
        sweepable: false,
        requiresActivation: true,
        minimumBalance: String(MIN_BALANCE),
      }
    }
    const balanceLine = accountInfo.balances.find((line) => line.asset_type === 'native')
    const amountMain = new BigNumber(balanceLine && balanceLine.balance ? balanceLine.balance : '0')
    this.logger.debug(`getBalance ${address}/${extraId}`, amountMain)
    const spendableBalance = amountMain.minus(MIN_BALANCE)
    return {
      confirmedBalance: amountMain.toString(),
      unconfirmedBalance: '0',
      spendableBalance: spendableBalance.toString(),
      sweepable: this.isSweepableAddressBalance(amountMain),
      requiresActivation: amountMain.lt(MIN_BALANCE),
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
    const accountInfo = await this.loadAccountOrThrow(address)
    return new BigNumber(accountInfo.sequence).plus(1).toString()
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

  async getLatestBlock(): Promise<Stellar.ServerApi.LedgerRecord> {
    const page = await this._retryDced(() => this.getApi().ledgers()
      .order('desc')
      .limit(1)
      .call())
    if (!page.records) {
      throw new Error('Failed to get stellar ledger records')
    }
    return page.records[0]
  }

  async getTransactionInfo(txId: string): Promise<StellarTransactionInfo> {
    let tx: Stellar.ServerApi.TransactionRecord
    try {
      tx = await this._retryDced(() => this.getApi().transactions().transaction(txId).call())
    } catch (e) {
      const eString = e.toString()
      if (NOT_FOUND_ERRORS.some(type => eString.includes(type))) {
        throw new Error(`Transaction not found: ${eString}`)
      }
      throw e
    }
    // this.logger.debug('getTransactionInfo', txId, omitHidden(tx))
    const { amount, fee, fromAddress, toAddress } = await this._normalizeTxOperation(tx)
    const fromIndex = this.resolveIndexFromAddressAndMemo(fromAddress, tx.memo)
    const toIndex = this.resolveIndexFromAddressAndMemo(toAddress, tx.memo)
    const confirmationNumber = tx.ledger_attr
    const ledger = await this._retryDced(() => tx.ledger())
    const currentLedger = await this.getLatestBlock()
    const currentLedgerSequence = currentLedger.sequence
    const confirmationId = ledger.hash
    const confirmationTimestamp = ledger.closed_at ? new Date(ledger.closed_at) : null
    const confirmations = currentLedgerSequence - confirmationNumber
    const sequenceNumber = tx.source_account_sequence
    const isExecuted = (tx as any).successful
    const isConfirmed = Boolean(confirmationNumber)
    const status = isConfirmed || isExecuted ? TransactionStatus.Confirmed : TransactionStatus.Pending
    return {
      status,
      id: tx.id,
      fromIndex,
      fromAddress,
      fromExtraId: null,
      toIndex,
      toAddress,
      toExtraId: tx.memo || null,
      amount: amount.toString(),
      fee: fee.toString(),
      sequenceNumber,
      confirmationId,
      confirmationNumber: String(confirmationNumber),
      confirmationTimestamp,
      isExecuted,
      isConfirmed,
      confirmations,
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
      targetFeeLevel = feeOption.feeLevel || DEFAULT_FEE_LEVEL
      const feeStats = await this._retryDced(() => this.getApi().feeStats())
      feeBase = feeStats.fee_charged.p10
      if (targetFeeLevel === FeeLevel.Medium) {
        feeBase = feeStats.fee_charged.p50
      } else if (targetFeeLevel === FeeLevel.High) {
        feeBase = feeStats.fee_charged.p95
      }
      feeMain = this.toMainDenomination(feeBase)
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
    const result = await this._retryDced(() => this.getApi().submitTransaction(preparedTx))
    this.logger.debug('broadcasted', omitHidden(result))
    return {
      id: result.hash,
      rebroadcast,
      data: result,
    }
  }
}
