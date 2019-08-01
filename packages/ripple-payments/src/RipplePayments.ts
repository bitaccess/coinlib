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
import { Logger, assertType } from '@faast/ts-common'
import BigNumber from 'bignumber.js'
import { RippleAPI } from 'ripple-lib'
import { FormattedPaymentTransaction, FormattedPayment, Prepare } from 'ripple-lib/dist/npm/transaction/types'
import { Adjustment } from 'ripple-lib/dist/npm/common/types/objects'

import {
  RipplePaymentsConfig,
  RippleUnsignedTransaction,
  RippleSignedTransaction,
  RippleBroadcastResult,
  RippleTransactionInfo,
  RippleCreateTransactionOptions,
} from './types'
import { xprvToXpub, deriveKeyPair, KeyPair } from './bip44'
import { RipplePaymentsUtils } from './RipplePaymentsUtils'

function tagToExtraId(tag: number | undefined): string | null {
  return typeof tag === 'number' ? String(tag) : null
}
function extraIdToTag(extraId: string | null | undefined): number | undefined {
  return typeof extraId === 'string' ? Number.parseInt(extraId) : undefined
}

export class RipplePayments extends RipplePaymentsUtils
  implements
    BasePayments<
      RipplePaymentsConfig,
      RippleUnsignedTransaction,
      RippleSignedTransaction,
      RippleBroadcastResult,
      RippleTransactionInfo
    > {
  readonly rippleApi: RippleAPI
  readonly xprv: string | null
  readonly xpub: string
  readonly hotwalletKeyPair: KeyPair
  readonly depositKeyPair: KeyPair
  readonly logger: Logger

  constructor(public readonly config: RipplePaymentsConfig) {
    super(config)
    if (config.server) {
      if (this.isValidXprv(config.hdKey)) {
        this.xprv = config.hdKey
        this.xpub = xprvToXpub(this.xprv)
      } else if (this.isValidXpub(config.hdKey)) {
        this.xprv = null
        this.xpub = config.hdKey
      } else {
        throw new Error('Account must be a valid xprv or xpub')
      }
      this.hotwalletKeyPair = deriveKeyPair(config.hdKey, 0)
      this.depositKeyPair = deriveKeyPair(config.hdKey, 1)
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

  getPublicConfig() {
    return {
      ...this.config,
      hdKey: xprvToXpub(this.config.hdKey),
    }
  }

  getAccountIds(): string[] {
    return [this.xpub]
  }

  getAccountId(): string {
    return this.xpub
  }

  async resolvePayport(payportOrIndex: Payport | number): Promise<Payport> {
    if (typeof payportOrIndex === 'number') {
      return this.getPayport(payportOrIndex)
    }
    return payportOrIndex
  }
  async resolveFromTo(from: number, to: Payport | number): Promise<FromTo> {
    const fromPayport = await this.getPayport(from)
    const toPayport = await this.resolvePayport(to)
    return {
      fromAddress: fromPayport.address,
      fromIndex: from,
      fromExtraId: fromPayport.extraId,
      toAddress: toPayport.address,
      toIndex: typeof to === 'number' ? to : null,
      toExtraId: toPayport.extraId,
    }
  }

  async getPayport(index: number): Promise<Payport> {
    if (index === 0) {
      return { address: this.hotwalletKeyPair.address }
    }
    return { address: this.depositKeyPair.address, extraId: String(index) }
  }

  requiresBalanceMonitor() {
    return true
  }

  isSweepableAddressBalance(balance: string): boolean {
    return new BigNumber(balance).gt(20)
  }

  async getBalance(payportOrIndex: Payport | number): Promise<BalanceResult> {
    const payport = await this.resolvePayport(payportOrIndex)
    const { address, extraId } = payport
    if (typeof extraId === 'string') {
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
    if (address === this.hotwalletKeyPair.address) {
      return 0
    } else if (address === this.depositKeyPair.address) {
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

  async createTransaction(
    from: number,
    to: Payport | number,
    amount: string,
    options: RippleCreateTransactionOptions = { feeLevel: FeeLevel.Medium },
  ): Promise<RippleUnsignedTransaction> {
    const { fromIndex, fromAddress, fromExtraId, toIndex, toAddress, toExtraId } = await this.resolveFromTo(from, to)
    const amountBn = new BigNumber(amount)
    if (amountBn.isNaN()) {
      throw new Error(`Invalid amount provided to ripple createTransaction: ${amount}`)
    }
    const { targetFeeLevel, targetFeeRate, targetFeeRateType, feeMain } = await this.resolveFeeOption(options)
    const { maxLedgerVersionOffset, sequence } = options
    const preparedTx = this.rippleApi.preparePayment(
      fromAddress,
      {
        source: {
          address: fromAddress,
          tag: extraIdToTag(fromExtraId),
          amount: {
            currency: 'XRP',
            value: amount,
          },
        },
        destination: {
          address: toAddress,
          tag: extraIdToTag(toExtraId),
          amount: {
            currency: 'XRP',
            value: amount,
          },
        },
      },
      {
        maxLedgerVersionOffset: maxLedgerVersionOffset || this.config.maxLedgerVersionOffset,
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
      amount,
      targetFeeLevel,
      targetFeeRate,
      targetFeeRateType,
      fee: feeMain,
      status: 'unsigned',
      data: preparedTx,
    }
  }

  async createSweepTransaction(
    from: number,
    to: Payport | number,
    options?: RippleCreateTransactionOptions,
  ): Promise<RippleUnsignedTransaction> {
    throw new Error('Method not implemented.')
  }

  async signTransaction(unsignedTx: RippleUnsignedTransaction): Promise<RippleSignedTransaction> {
    assertType(RippleUnsignedTransaction, unsignedTx)
    const { txJSON } = unsignedTx.data as Prepare
    let keyPair
    if (unsignedTx.fromAddress === this.hotwalletKeyPair.address) {
      keyPair = this.hotwalletKeyPair
    } else if (unsignedTx.fromAddress === this.depositKeyPair.address) {
      keyPair = this.depositKeyPair
    } else {
      throw new Error(`Cannot sign ripple transaction from address ${unsignedTx.fromAddress}`)
    }
    const signResult = this.rippleApi.sign(txJSON, keyPair)
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
