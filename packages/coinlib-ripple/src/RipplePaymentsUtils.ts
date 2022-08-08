import {
  PaymentsUtils,
  Payport,
  AutoFeeLevels,
  FeeLevel,
  FeeRate,
  FeeRateType,
  TransactionStatus,
  BlockInfo,
  BigNumber,
  NetworkType,
} from '@bitaccess/coinlib-common'
import { isNil, assertType, Numeric, isMatchingError, isUndefined, isString } from '@bitaccess/ts-common'

import {
  toMainDenominationString,
  toBaseDenominationString,
  isValidXprv,
  isValidXpub,
  isValidAddress,
  isValidExtraId,
  determinePathForIndex,
  deriveUniPubKeyForPath,
  isSupportedAddressType,
  getSupportedAddressTypes,
} from './helpers'
import { RippleTransactionInfo } from './types'
import { RippleConnected } from './RippleConnected'
import { DECIMAL_PLACES, COIN_NAME, COIN_SYMBOL, FEE_LEVEL_CUSHIONS, NOT_FOUND_ERRORS, MIN_BALANCE } from './constants'
import { FormattedPaymentTransaction } from 'ripple-lib'
import { Amount } from 'ripple-lib/dist/npm/common/types/objects'

export class RipplePaymentsUtils extends RippleConnected implements PaymentsUtils {
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

  private async _getPayportValidationMessage(payport: Payport): Promise<string | undefined> {
    const { address, extraId } = payport
    if (!this.isValidAddress(address)) {
      return 'Invalid payport address'
    }
    let requireExtraId = false
    try {
      const settings = await this._retryDced(() => this.api.getSettings(address))
      requireExtraId = settings.requireDestinationTag || false
    } catch (e) {
      this.logger.log(`getPayportValidationMessage failed to retrieve settings for ${address} - ${e.message}`)
    }
    if (isNil(extraId)) {
      if (requireExtraId) {
        return `Payport extraId is required for address ${address} with ripple requireDestinationTag setting enabled`
      }
    } else if (!this.isValidExtraId(extraId)) {
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
    payport = assertType(Payport, payport, 'payport')
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

  toMainDenomination(amount: string | number): string {
    return toMainDenominationString(amount)
  }

  toBaseDenomination(amount: string | number): string {
    return toBaseDenominationString(amount)
  }

  isValidXprv = isValidXprv
  isValidXpub = isValidXpub

  async getFeeRateRecommendation(level: AutoFeeLevels): Promise<FeeRate> {
    const feeMain = await this._retryDced(() => this.api.getFee(FEE_LEVEL_CUSHIONS[level]))
    return {
      feeRate: feeMain,
      feeRateType: FeeRateType.Main,
    }
  }

  async getCurrentBlockNumber() {
    return this._retryDced(() => this.api.getLedgerVersion())
  }

  async getAddressUtxos() {
    return []
  }

  isAddressBalanceSweepable(balance: Numeric) {
    return new BigNumber(balance).gt(MIN_BALANCE)
  }

  async getAddressBalance(address: string) {
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
      sweepable: this.isAddressBalanceSweepable(xrpAmount),
      requiresActivation: confirmedBalance.lt(MIN_BALANCE),
      minimumBalance: String(MIN_BALANCE),
    }
  }

  async getAddressNextSequenceNumber(address: string): Promise<string> {
    const accountInfo = await this._retryDced(() => this.api.getAccountInfo(address))
    return new BigNumber(accountInfo.sequence).toString()
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
    const amount = amountObject.value
    const isSuccessful = outcome.result.startsWith('tes')
    const isCostDestroyed = outcome.result.startsWith('tec')
    const status = isSuccessful || isCostDestroyed ? TransactionStatus.Confirmed : TransactionStatus.Failed
    const isExecuted = isSuccessful
    const confirmationNumber = outcome.ledgerVersion
    const ledger = await this._retryDced(() => this.api.getLedger({ ledgerVersion: confirmationNumber }))
    const currentLedgerVersion = await this.getCurrentBlockNumber()
    const confirmationId = ledger.ledgerHash
    const confirmationTimestamp = outcome.timestamp ? new Date(outcome.timestamp) : null
    return {
      status,
      id: tx.id,
      fromIndex: null,
      fromAddress: source.address,
      fromExtraId: typeof source.tag !== 'undefined' ? String(source.tag) : null,
      toIndex: null,
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

  async getBlock(id?: string | number): Promise<BlockInfo> {
    if (isUndefined(id)) {
      id = await this.api.getLedgerVersion()
    }
    const raw = await this.api.getLedger(isString(id) ? { ledgerHash: id } : { ledgerVersion: id })
    return {
      id: raw.ledgerHash,
      height: raw.ledgerVersion,
      previousId: raw.parentLedgerHash,
      time: new Date(raw.closeTime),
      raw,
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
