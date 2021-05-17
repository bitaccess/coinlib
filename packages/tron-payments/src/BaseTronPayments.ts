import { Transaction as TronTransaction } from 'tronweb'
import { cloneDeep } from 'lodash'
import {
  BalanceResult,
  BasePayments,
  TransactionStatus,
  FeeLevel,
  FeeOption,
  FeeRateType,
  FeeOptionCustom,
  ResolvedFeeOption,
  Payport,
  FromTo,
  ResolveablePayport,
  PaymentsError,
  PaymentsErrorCode,
  PayportOutput,
} from '@faast/payments-common'
import { isType, Numeric } from '@faast/ts-common'

import {
  TronTransactionInfo,
  TronUnsignedTransaction,
  TronSignedTransaction,
  TronBroadcastResult,
  CreateTransactionOptions,
  BaseTronPaymentsConfig,
  TronWebTransaction,
} from './types'
import { toBaseDenominationNumber, isValidAddress, toMainDenominationBigNumber } from './helpers'
import { toError } from './utils'
import {
  MIN_BALANCE_SUN,
  MIN_BALANCE_TRX,
  DEFAULT_FEE_LEVEL,
  EXPIRATION_FUDGE_MS,
  TX_EXPIRATION_EXTENSION_SECONDS,
} from './constants'
import { TronPaymentsUtils } from './TronPaymentsUtils'

export abstract class BaseTronPayments<Config extends BaseTronPaymentsConfig> extends TronPaymentsUtils
  implements
    BasePayments<Config, TronUnsignedTransaction, TronSignedTransaction, TronBroadcastResult, TronTransactionInfo> {
  // You may notice that many function blocks are enclosed in a try/catch.
  // I had to do this because tronweb thinks it's a good idea to throw
  // strings instead of Errors and now we need to convert them all ourselves
  // to be consistent.

  constructor(config: Config) {
    super(config)
  }

  abstract getFullConfig(): Config
  abstract getPublicConfig(): Config
  abstract getAccountId(index: number): string
  abstract getAccountIds(): string[]
  abstract getPayport(index: number): Promise<Payport>
  abstract getPrivateKey(index: number): Promise<string>

  async init() {}
  async destroy() {}

  requiresBalanceMonitor() {
    return false
  }

  async getBalance(resolveablePayport: ResolveablePayport): Promise<BalanceResult> {
    const payport = await this.resolvePayport(resolveablePayport)
    return this.getAddressBalance(payport.address)
  }

  async resolveFeeOption(feeOption: FeeOption): Promise<ResolvedFeeOption> {
    let targetFeeLevel: FeeLevel
    if (isType(FeeOptionCustom, feeOption)) {
      if (feeOption.feeRate !== '0') {
        throw new Error('tron-payments custom fees are unsupported')
      }
      targetFeeLevel = FeeLevel.Custom
    } else {
      targetFeeLevel = feeOption.feeLevel || DEFAULT_FEE_LEVEL
    }
    return {
      targetFeeLevel,
      targetFeeRate: '0',
      targetFeeRateType: FeeRateType.Base,
      feeBase: '0',
      feeMain: '0',
    }
  }

  async buildUnsignedTx(toAddress: string, amountSun: number, fromAddress: string): Promise<TronTransaction> {
    let tx = await this.tronweb.transactionBuilder.sendTrx(toAddress, amountSun, fromAddress)
    tx = await this.tronweb.transactionBuilder.extendExpiration(tx, TX_EXPIRATION_EXTENSION_SECONDS)
    return tx
  }

  async createServiceTransaction(): Promise<null> {
    return null
  }

  async createJoinedTransaction(): Promise<null> {
    return null
  }

  async createSweepTransaction(
    from: number,
    to: ResolveablePayport,
    options: CreateTransactionOptions = {},
  ): Promise<TronUnsignedTransaction> {
    this.logger.debug('createSweepTransaction', from, to)
    try {
      const { fromAddress, fromIndex, fromPayport, toAddress, toIndex } = await this.resolveFromTo(from, to)
      const { targetFeeLevel, targetFeeRate, targetFeeRateType, feeBase, feeMain } = await this.resolveFeeOption(
        options,
      )
      const feeSun = Number.parseInt(feeBase)
      const { confirmedBalance: balanceTrx } = await this.getBalance(fromPayport)
      const balanceSun = toBaseDenominationNumber(balanceTrx)
      if (!this.canSweepBalanceSun(balanceSun)) {
        throw new Error(
          `Insufficient balance (${balanceTrx}) to sweep with fee of ${feeMain} ` +
            `while maintaining a minimum required balance of ${MIN_BALANCE_TRX}`,
        )
      }
      const amountSun = balanceSun - feeSun - MIN_BALANCE_SUN
      const amountTrx = this.toMainDenomination(amountSun)
      const tx = await this.buildUnsignedTx(toAddress, amountSun, fromAddress)
      return {
        status: TransactionStatus.Unsigned,
        id: tx.txID,
        fromAddress,
        toAddress,
        toExtraId: null,
        fromIndex,
        toIndex,
        amount: amountTrx,
        fee: feeMain,
        targetFeeLevel,
        targetFeeRate,
        targetFeeRateType,
        sequenceNumber: null,
        data: tx,
      }
    } catch (e) {
      throw toError(e)
    }
  }

  async createTransaction(
    from: number,
    to: ResolveablePayport,
    amountTrx: string,
    options: CreateTransactionOptions = {},
  ): Promise<TronUnsignedTransaction> {
    this.logger.debug('createTransaction', from, to, amountTrx)
    try {
      const { fromAddress, fromIndex, fromPayport, toAddress, toIndex } = await this.resolveFromTo(from, to)
      const { targetFeeLevel, targetFeeRate, targetFeeRateType, feeBase, feeMain } = await this.resolveFeeOption(
        options,
      )
      const feeSun = Number.parseInt(feeBase)
      const { confirmedBalance: balanceTrx } = await this.getBalance(fromPayport)
      const balanceSun = toBaseDenominationNumber(balanceTrx)
      const amountSun = toBaseDenominationNumber(amountTrx)
      if (balanceSun - feeSun - MIN_BALANCE_SUN < amountSun) {
        throw new Error(
          `Insufficient balance (${balanceTrx}) to send ${amountTrx} including fee of ${feeMain} ` +
            `while maintaining a minimum required balance of ${MIN_BALANCE_TRX}`,
        )
      }
      const tx = await this.buildUnsignedTx(toAddress, amountSun, fromAddress)
      return {
        status: TransactionStatus.Unsigned,
        id: tx.txID,
        fromAddress,
        toAddress,
        toExtraId: null,
        fromIndex,
        toIndex,
        amount: amountTrx,
        fee: feeMain,
        targetFeeLevel,
        targetFeeRate,
        targetFeeRateType,
        sequenceNumber: null,
        data: tx,
      }
    } catch (e) {
      throw toError(e)
    }
  }

  async signTransaction(unsignedTx: TronUnsignedTransaction): Promise<TronSignedTransaction> {
    try {
      const fromPrivateKey = await this.getPrivateKey(unsignedTx.fromIndex)
      const unsignedRaw = cloneDeep(unsignedTx.data) as TronWebTransaction // tron modifies unsigned object
      const signedTx = await this.tronweb.trx.sign(unsignedRaw, fromPrivateKey)
      return {
        ...unsignedTx,
        status: TransactionStatus.Signed,
        data: signedTx,
      }
    } catch (e) {
      throw toError(e)
    }
  }

  async broadcastTransaction(tx: TronSignedTransaction): Promise<TronBroadcastResult> {
    /*
     * I’ve discovered that tron nodes like to “remember” every transaction you give it.
     * If you try broadcasting an invalid TX the first time you’ll get a `SIGERROR` but
     * every subsequent broadcast gives a `DUP_TRANSACTION_ERROR`. Which is the exact same
     * error you get after rebroadcasting a valid transaction. And to make things worse,
     * if you try to look up the invalid transaction by ID it tells you `Transaction not found`.
     * So in order to actually determine the status of a broadcast the logic becomes:
     * `success status` -> broadcast succeeded
     * `error status` -> broadcast failed
     * `(DUP_TRANSACTION_ERROR && Transaction found)` -> tx already broadcast
     * `(DUP_TRANASCTION_ERROR && Transaction not found)` -> tx was probably invalid? Maybe? Who knows…
     */
    try {
      const status = await this._retryDced(() => this.tronweb.trx.sendRawTransaction(tx.data as TronWebTransaction))
      let success = false
      let rebroadcast = false
      if (status.result || status.code === 'SUCCESS') {
        success = true
      } else {
        try {
          await this._retryDced(() => this.tronweb.trx.getTransaction(tx.id))
          success = true
          rebroadcast = true
        } catch (e) {
          const expiration = tx.data && (tx.data as TronTransaction).raw_data.expiration
          if (expiration && Date.now() > expiration + EXPIRATION_FUDGE_MS) {
            throw new PaymentsError(PaymentsErrorCode.TxExpired, 'Transaction has expired')
          }
        }
      }
      if (success) {
        return {
          id: tx.id,
          rebroadcast,
        }
      } else {
        let statusCode: string | undefined = status.code
        if (statusCode === 'TRANSACTION_EXPIRATION_ERROR') {
          throw new PaymentsError(PaymentsErrorCode.TxExpired, `${statusCode} ${status.message || ''}`)
        }
        if (statusCode === 'DUP_TRANSACTION_ERROR') {
          statusCode = 'DUP_TX_BUT_TX_NOT_FOUND_SO_PROBABLY_INVALID_TX_ERROR'
        }
        this.logger.warn(`Tron broadcast tx unsuccessful ${tx.id}`, status)
        throw new Error(`Failed to broadcast transaction: ${statusCode} ${status.message}`)
      }
    } catch (e) {
      throw toError(e)
    }
  }

  isSweepableBalance(balanceTrx: Numeric): boolean {
    return this.isAddressBalanceSweepable(balanceTrx)
  }

  usesSequenceNumber() {
    return false
  }

  async getNextSequenceNumber() {
    return null
  }

  usesUtxos() {
    return false
  }

  async getUtxos() {
    return []
  }

  // HELPERS

  async resolvePayport(payport: ResolveablePayport): Promise<Payport> {
    if (typeof payport === 'number') {
      return this.getPayport(payport)
    } else if (typeof payport === 'string') {
      if (!isValidAddress(payport)) {
        throw new Error(`Invalid TRON address: ${payport}`)
      }
      return { address: payport }
    }
    if (!this.isValidPayport(payport)) {
      throw new Error(`Invalid TRON payport: ${JSON.stringify(payport)}`)
    }
    return payport
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

  async createMultiOutputTransaction(
    from: number,
    to: PayportOutput[],
    options: CreateTransactionOptions = {},
  ): Promise<null> {
    return null
  }
}

export default BaseTronPayments
