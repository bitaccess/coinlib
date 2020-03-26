import { PaymentsUtils, Payport, createUnitConverters, MaybePromise } from '@faast/payments-common'
import { Network as BitcoinjsNetwork } from 'bitcoinjs-lib'
import { isNil, assertType, Numeric, isUndefined } from '@faast/ts-common'
import { BlockbookConnected } from './BlockbookConnected'
import { BitcoinishBlock, BitcoinishPaymentsUtilsConfig } from './types'

type UnitConverters = ReturnType<typeof createUnitConverters>

export abstract class BitcoinishPaymentsUtils extends BlockbookConnected implements PaymentsUtils {

  decimals: number
  bitcoinjsNetwork: BitcoinjsNetwork

  constructor(config: BitcoinishPaymentsUtilsConfig) {
    super(config)
    this.decimals = config.decimals
    this.bitcoinjsNetwork = config.bitcoinjsNetwork
    const unitConverters = createUnitConverters(this.decimals)
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

  abstract isValidAddress(address: string): MaybePromise<boolean>

  private async _getPayportValidationMessage(payport: Payport): Promise<string | undefined> {
    const { address, extraId } = payport
    if (!await this.isValidAddress(address)) {
      return 'Invalid payport address'
    }
    if (!isNil(extraId)) {
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
