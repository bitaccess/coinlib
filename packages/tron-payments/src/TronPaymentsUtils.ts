import { PaymentsUtils, NetworkType, Payport, AutoFeeLevels, FeeRate, FeeRateType, BalanceResult } from '@faast/payments-common'
import { Logger, DelegateLogger, isNil, assertType, Numeric } from '@faast/ts-common'
import TronWeb from 'tronweb'

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
import { BaseTronPaymentsConfig } from './types'
import { retryIfDisconnected, toError } from './utils'
import BigNumber from 'bignumber.js'

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

  private async _getPayportValidationMessage(payport: Payport): Promise<string | undefined> {
    const { address, extraId } = payport
    if (!isValidAddress(address)) {
      return 'Invalid payport address'
    }
    if (!isNil(extraId) && !isValidExtraId(extraId)) {
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
    return Payport.is(payport) && !(await this._getPayportValidationMessage(payport))
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
}
