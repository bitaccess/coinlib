import {
  AutoFeeLevels,
  BalanceResult,
  FeeLevel,
  FeeRate,
  FeeRateType,
  PaymentsUtils,
  Payport,
  TransactionStatus,
  BigNumber,
  NetworkType,
} from '@bitaccess/coinlib-common'
import { isNil, assertType, Numeric, isMatchingError } from '@bitaccess/ts-common'
import * as Stellar from 'stellar-sdk'

import {
  toMainDenominationString,
  toBaseDenominationString,
  isValidAddress,
  isValidExtraId,
  determinePathForIndex,
  deriveUniPubKeyForPath,
  isSupportedAddressType,
  getSupportedAddressTypes,
} from './helpers'
import { StellarConnected } from './StellarConnected'
import { COIN_NAME, COIN_SYMBOL, DECIMAL_PLACES, MIN_BALANCE, NOT_FOUND_ERRORS } from './constants'
import { StellarTransactionInfo } from './types'

export class StellarPaymentsUtils extends StellarConnected implements PaymentsUtils {
  readonly coinSymbol = COIN_SYMBOL
  readonly coinName = COIN_NAME
  readonly coinDecimals = DECIMAL_PLACES

  isValidExtraId(extraId: string): boolean {
    return isValidExtraId(extraId)
  }

  isValidAddress(address: string): boolean {
    return isValidAddress(address)
  }

  standardizeAddress(address: string): string | null {
    if (!isValidAddress(address)) {
      return null
    }
    return address
  }

  async _getPayportValidationMessage(payport: Payport): Promise<string | undefined> {
    const { address, extraId } = payport
    if (!this.isValidAddress(address)) {
      return 'Invalid payport address'
    }
    if (!isNil(extraId) && !this.isValidExtraId(extraId)) {
      return 'Invalid payport extraId'
    }
  }

  async getPayportValidationMessage(payport: Payport): Promise<string | undefined> {
    try {
      payport = assertType(Payport, payport, 'payport')
    } catch (e) {
      return e.message
    }
    return this._getPayportValidationMessage(payport)
  }

  async validatePayport(payport: Payport): Promise<void> {
    assertType(Payport, payport, 'payport')
    const message = await this._getPayportValidationMessage(payport)
    if (message) {
      throw new Error(message)
    }
  }

  async isValidPayport(payport: Payport): Promise<boolean> {
    if (!Payport.is(payport)) {
      return false
    }
    return !(await this._getPayportValidationMessage(payport))
  }

  toMainDenomination(amount: Numeric): string {
    return toMainDenominationString(amount)
  }

  toBaseDenomination(amount: Numeric): string {
    return toBaseDenominationString(amount)
  }

  async getFeeRateRecommendation(level: AutoFeeLevels): Promise<FeeRate> {
    const feeStats = await this._retryDced(() => this.getApi().feeStats())
    let feeBase = feeStats.fee_charged.p10
    if (level === FeeLevel.Medium) {
      feeBase = feeStats.fee_charged.p50
    } else if (level === FeeLevel.High) {
      feeBase = feeStats.fee_charged.p95
    }
    return {
      feeRate: feeBase,
      feeRateType: FeeRateType.Base,
    }
  }

  async getCurrentBlockNumber() {
    return this._retryDced(async () => (await this.getBlock()).height)
  }

  async getAddressUtxos() {
    return []
  }

  isAddressBalanceSweepable(balance: Numeric): boolean {
    return new BigNumber(balance).gt(MIN_BALANCE)
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

  async getAddressBalance(address: string): Promise<BalanceResult> {
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
    const balanceLine = accountInfo.balances.find(line => line.asset_type === 'native')
    const amountMain = new BigNumber(balanceLine && balanceLine.balance ? balanceLine.balance : '0')
    const spendableBalance = amountMain.minus(MIN_BALANCE)
    return {
      confirmedBalance: amountMain.toString(),
      unconfirmedBalance: '0',
      spendableBalance: spendableBalance.toString(),
      sweepable: this.isAddressBalanceSweepable(amountMain),
      requiresActivation: amountMain.lt(MIN_BALANCE),
      minimumBalance: String(MIN_BALANCE),
    }
  }

  async getAddressNextSequenceNumber(address: string) {
    const accountInfo = await this.loadAccountOrThrow(address)
    return new BigNumber(accountInfo.sequence).plus(1).toString()
  }

  async getLatestBlock(): Promise<Stellar.ServerApi.LedgerRecord> {
    const page = await this._retryDced(() =>
      this.getApi()
        .ledgers()
        .order('desc')
        .limit(1)
        .call(),
    )
    if (!page.records) {
      throw new Error('Failed to get stellar ledger records')
    }
    return page.records[0]
  }

  async getTransactionInfo(txId: string): Promise<StellarTransactionInfo> {
    let tx: Stellar.ServerApi.TransactionRecord
    try {
      tx = await this._retryDced(() =>
        this.getApi()
          .transactions()
          .transaction(txId)
          .call(),
      )
    } catch (e) {
      const eString = e.toString()
      if (NOT_FOUND_ERRORS.some(type => eString.includes(type))) {
        throw new Error(`Transaction not found: ${eString}`)
      }
      throw e
    }
    // this.logger.debug('getTransactionInfo', txId, omitHidden(tx))
    const { amount, fee, fromAddress, toAddress } = await this._normalizeTxOperation(tx)
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
      fromIndex: null,
      fromAddress,
      fromExtraId: null,
      toIndex: null,
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

  isSupportedAddressType(addressType: string): boolean {
    return isSupportedAddressType(addressType)
  }

  getSupportedAddressTypes(): string[] {
    return getSupportedAddressTypes()
  }

  determinePathForIndex(accountIndex: number, addressType?: any): string {
    const networkType: NetworkType = this.networkType
    const derivationPath: string = determinePathForIndex(accountIndex, addressType, networkType)
    return derivationPath
  }

  deriveUniPubKeyForPath(seed: Buffer, derivationPath: string): string {
    const uniPubKey: string = deriveUniPubKeyForPath(seed, derivationPath)
    return uniPubKey
  }
}
