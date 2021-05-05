import { PaymentsUtils, Payport, createUnitConverters, MaybePromise, AutoFeeLevels, FeeRate, NetworkType } from '@faast/payments-common'
import { Network as BitcoinjsNetwork } from 'bitcoinjs-lib'
import { isNil, assertType, Numeric, isUndefined } from '@faast/ts-common'

import { BlockbookConnected } from './BlockbookConnected'
import { BitcoinishBlock, BitcoinishPaymentsUtilsConfig } from './types'

type UnitConverters = ReturnType<typeof createUnitConverters>

export abstract class BitcoinishPaymentsUtils extends BlockbookConnected implements PaymentsUtils {

  readonly coinSymbol: string
  readonly coinName: string
  readonly coinDecimals: number
  readonly bitcoinjsNetwork: BitcoinjsNetwork

  constructor(config: BitcoinishPaymentsUtilsConfig) {
    super(config)
    this.coinSymbol = config.coinSymbol
    this.coinName = config.coinName
    this.coinDecimals = config.coinDecimals
    this.bitcoinjsNetwork = config.bitcoinjsNetwork

    const unitConverters = createUnitConverters(this.coinDecimals)
    this.toMainDenominationString = unitConverters.toMainDenominationString
    this.toMainDenominationNumber = unitConverters.toMainDenominationNumber
    this.toMainDenominationBigNumber = unitConverters.toMainDenominationBigNumber
    this.toBaseDenominationString = unitConverters.toBaseDenominationString
    this.toBaseDenominationNumber = unitConverters.toBaseDenominationNumber
    this.toBaseDenominationBigNumber = unitConverters.toBaseDenominationBigNumber
  }

  isValidExtraId(extraId: string): boolean {
    return false // utxo coins don't use extraIds
  }

  abstract isValidAddress<O extends { format?: string }>(address: string, options?: O): boolean
  abstract standardizeAddress<O extends { format?: string }>(address: string, options?: O): string | null
  abstract getFeeRateRecommendation(level: AutoFeeLevels): MaybePromise<FeeRate>

  private _getPayportValidationMessage(payport: Payport): string | undefined {
    const { address, extraId } = payport
    if (!this.isValidAddress(address)) {
      return 'Invalid payport address'
    }
    if (!isNil(extraId)) {
      return 'Invalid payport extraId'
    }
  }

  getPayportValidationMessage(payport: Payport): string | undefined {
    try {
      payport = assertType(Payport, payport, 'payport')
    } catch (e) {
      return e.message
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

  validateAddress(address: string): void {
    if (!this.isValidAddress(address)) {
      throw new Error(`Invalid ${this.coinName} address: ${address}`)
    }
  }

  isValidPayport(payport: Payport): boolean {
    return Payport.is(payport) && !(this._getPayportValidationMessage(payport))
  }

  toMainDenomination(amount: Numeric): string {
    return this.toMainDenominationString(amount)
  }

  toBaseDenomination(amount: Numeric): string {
    return this.toBaseDenominationString(amount)
  }

  toMainDenominationString: UnitConverters['toMainDenominationString']
  toMainDenominationNumber: UnitConverters['toMainDenominationNumber']
  toMainDenominationBigNumber: UnitConverters['toMainDenominationBigNumber']

  toBaseDenominationString: UnitConverters['toMainDenominationString']
  toBaseDenominationNumber: UnitConverters['toMainDenominationNumber']
  toBaseDenominationBigNumber: UnitConverters['toMainDenominationBigNumber']

  async getBlock(id?: string | number): Promise<BitcoinishBlock> {
    if (isUndefined(id)) {
      id = (await this.getApi().getStatus()).backend.bestBlockHash
    }
    return this.getApi().getBlock(id)
  }
}
