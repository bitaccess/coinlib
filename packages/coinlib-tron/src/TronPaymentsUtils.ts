import {
  PaymentsUtils,
  NetworkType,
  Payport,
  AutoFeeLevels,
  FeeRate,
  FeeRateType,
  BalanceResult,
  TransactionStatus,
  BlockInfo,
  BigNumber,
} from '@bitaccess/coinlib-common'
import { Logger, DelegateLogger, isNil, assertType, Numeric, isUndefined } from '@faast/ts-common'
import TronWeb, { Transaction as TronTransaction } from 'tronweb'

import {
  toMainDenominationString,
  toBaseDenominationString,
  isValidXprv,
  isValidXpub,
  isValidAddress,
  isValidExtraId,
  isValidPrivateKey,
  privateKeyToAddress,
  toMainDenominationBigNumber,
  isSupportedAddressType,
  getSupportedAddressTypes,
  determinePathForIndex,
  deriveUniPubKeyForPath,
} from './helpers'
import {
  COIN_NAME,
  COIN_SYMBOL,
  DECIMAL_PLACES,
  DEFAULT_EVENT_SERVER,
  DEFAULT_FULL_NODE,
  DEFAULT_SOLIDITY_NODE,
  MIN_BALANCE_SUN,
  MIN_BALANCE_TRX,
  PACKAGE_NAME,
} from './constants'
import { BaseTronPaymentsConfig, TronTransactionInfo } from './types'
import { retryIfDisconnected, toError } from './utils'
import { pick } from 'lodash'

export class TronPaymentsUtils implements PaymentsUtils {
  readonly coinSymbol = COIN_SYMBOL
  readonly coinName = COIN_NAME
  readonly coinDecimals = DECIMAL_PLACES
  readonly networkType: NetworkType
  logger: Logger

  fullNode: string
  solidityNode: string
  eventServer: string
  tronweb: TronWeb

  constructor(config: BaseTronPaymentsConfig = {}) {
    assertType(BaseTronPaymentsConfig, config)
    this.networkType = config.network || NetworkType.Mainnet
    this.logger = new DelegateLogger(config.logger, PACKAGE_NAME)
    this.fullNode = config.fullNode || DEFAULT_FULL_NODE
    this.solidityNode = config.solidityNode || DEFAULT_SOLIDITY_NODE
    this.eventServer = config.eventServer || DEFAULT_EVENT_SERVER
    this.tronweb = new TronWeb(this.fullNode, this.solidityNode, this.eventServer)
  }

  async init() {}
  async destroy() {}

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

  private _getPayportValidationMessage(payport: Payport): string | undefined {
    const { address, extraId } = payport
    if (!isValidAddress(address)) {
      return 'Invalid payport address'
    }
    if (!isNil(extraId) && !isValidExtraId(extraId)) {
      return 'Invalid payport extraId'
    }
  }

  getPayportValidationMessage(payport: Payport): string | undefined {
    try {
      payport = assertType(Payport, payport, 'payport')
    } catch (e) {
      return e?.message
    }
    return this._getPayportValidationMessage(payport)
  }

  validatePayport(payport: Payport): void {
    payport = assertType(Payport, payport, 'payport')
    const message = this._getPayportValidationMessage(payport)
    if (message) {
      throw new Error(message)
    }
  }

  isValidPayport(payport: Payport): payport is Payport {
    return Payport.is(payport) && !this._getPayportValidationMessage(payport)
  }

  toMainDenomination(amount: string | number): string {
    return toMainDenominationString(amount)
  }

  toBaseDenomination(amount: string | number): string {
    return toBaseDenominationString(amount)
  }

  isValidXprv = isValidXprv
  isValidXpub = isValidXpub

  isValidPrivateKey = isValidPrivateKey
  privateKeyToAddress = privateKeyToAddress

  getFeeRateRecommendation(level: AutoFeeLevels): FeeRate {
    return { feeRate: '0', feeRateType: FeeRateType.Base }
  }

  async _retryDced<T>(fn: () => Promise<T>): Promise<T> {
    return retryIfDisconnected(fn, this.logger)
  }

  getCurrentBlockNumber() {
    return this._retryDced(async () => (await this.tronweb.trx.getCurrentBlock()).block_header.raw_data.number)
  }

  async getAddressUtxos() {
    return []
  }

  async getAddressNextSequenceNumber() {
    return null
  }

  protected canSweepBalanceSun(balanceSun: number): boolean {
    return balanceSun > MIN_BALANCE_SUN
  }

  isAddressBalanceSweepable(balanceTrx: Numeric): boolean {
    return new BigNumber(balanceTrx).gt(MIN_BALANCE_TRX)
  }

  async getAddressBalance(address: string): Promise<BalanceResult> {
    try {
      const balanceSun = await this._retryDced(() => this.tronweb.trx.getBalance(address))
      const sweepable = this.canSweepBalanceSun(balanceSun)
      const confirmedBalance = toMainDenominationBigNumber(balanceSun)
      const spendableBalance = BigNumber.max(0, confirmedBalance.minus(MIN_BALANCE_TRX))
      return {
        confirmedBalance: confirmedBalance.toString(),
        unconfirmedBalance: '0',
        spendableBalance: spendableBalance.toString(),
        sweepable,
        requiresActivation: false,
        minimumBalance: String(MIN_BALANCE_TRX),
      }
    } catch (e) {
      throw toError(e)
    }
  }

  private extractTxFields(tx: TronTransaction) {
    const contractParam = (tx.raw_data?.contract?.[0]?.parameter?.value as any) ?? null
    if (!(contractParam && typeof contractParam.amount === 'number')) {
      throw new Error('Unable to get transaction')
    }

    const amountSun = contractParam.amount || 0
    const amountTrx = this.toMainDenomination(amountSun)
    const toAddress = this.tronweb.address.fromHex(contractParam.to_address)
    const fromAddress = this.tronweb.address.fromHex(contractParam.owner_address)
    return {
      amountTrx,
      amountSun,
      toAddress,
      fromAddress,
    }
  }

  async getTransactionInfo(txid: string): Promise<TronTransactionInfo> {
    try {
      const [tx, txInfo, currentBlock] = await Promise.all([
        this._retryDced(() => this.tronweb.trx.getTransaction(txid)),
        this._retryDced(() => this.tronweb.trx.getTransactionInfo(txid)),
        this._retryDced(() => this.tronweb.trx.getCurrentBlock()),
      ])

      const { amountTrx, fromAddress, toAddress } = this.extractTxFields(tx)

      const contractRet = tx.ret?.[0]?.contractRet
      const isExecuted = contractRet === 'SUCCESS'

      const block = txInfo.blockNumber || null
      const feeTrx = this.toMainDenomination(txInfo.fee || 0)

      const currentBlockNumber = currentBlock.block_header?.raw_data?.number ?? 0
      const confirmations = currentBlockNumber && block ? currentBlockNumber - block : 0
      const isConfirmed = confirmations > 0

      const confirmationTimestamp = txInfo.blockTimeStamp ? new Date(txInfo.blockTimeStamp) : null

      let status: TransactionStatus = TransactionStatus.Pending
      if (isConfirmed) {
        if (!isExecuted) {
          status = TransactionStatus.Failed
        }
        status = TransactionStatus.Confirmed
      }

      return {
        id: tx.txID,
        amount: amountTrx,
        toAddress,
        fromAddress,
        toExtraId: null,
        fromIndex: null,
        toIndex: null,
        fee: feeTrx,
        sequenceNumber: null,
        isExecuted,
        isConfirmed,
        confirmations,
        confirmationId: block ? String(block) : null,
        confirmationTimestamp,
        status,
        data: {
          ...tx,
          ...txInfo,
          currentBlock: pick(currentBlock, 'block_header', 'blockID'),
        },
      }
    } catch (e) {
      throw toError(e)
    }
  }

  async getBlock(id?: string | number): Promise<BlockInfo> {
    try {
      const raw = await this._retryDced(() =>
        isUndefined(id) ? this.tronweb.trx.getCurrentBlock() : this.tronweb.trx.getBlock(id),
      )
      return {
        id: raw.blockID,
        height: raw.block_header.raw_data.number,
        previousId: raw.block_header.raw_data.parentHash,
        time: new Date(raw.block_header.raw_data.timestamp * 1000),
        raw,
      }
    } catch (e) {
      throw toError(e)
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
