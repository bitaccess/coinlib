import Web3 from 'web3'
const web3 = new Web3()

import { PaymentsUtils, Payport, createUnitConverters } from '@faast/payments-common'
import {
  Numeric,
  Logger,
  DelegateLogger,
  isNil,
  assertType
} from '@faast/ts-common'
import { PACKAGE_NAME, DECIMAL_PLACES } from './constants'
import { BaseEthereumPaymentsConfig } from './types'
import { isValidXkey } from './bip44'

export class EthereumPaymentsUtils implements PaymentsUtils {
  logger: Logger

  constructor(config: BaseEthereumPaymentsConfig) {
    this.logger = new DelegateLogger(config.logger, PACKAGE_NAME)
  }

  toBaseDenomination(amount: Numeric): string {
    return this._toBaseDenominationString(amount)
  }

  toMainDenomination(amount: Numeric): string {
    return this._toMainDenominationString(amount)
  }

  async isValidAddress(address: string): Promise<boolean> {
    return web3.utils.isAddress(address)
  }

  async isValidExtraId(extraId: unknown): Promise<boolean> {
    return false;
  }

  // XXX Payport methods can be moved to payments-common
  async isValidPayport(payport: Payport): Promise<boolean> {
    return Payport.is(payport) && ! await this._getPayportValidationMessage(payport)
  }

  async validatePayport(payport: Payport): Promise<void> {
    const message = await this._getPayportValidationMessage(payport)
    if (message) {
      throw new Error(message)
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

  isValidXprv(xprv: string): boolean {
    return isValidXkey(xprv) && xprv.substring(0, 4) === 'xprv'
  }

  isValidXpub(xpub: string): boolean {
    return isValidXkey(xpub) && xpub.substring(0, 4) === 'xpub'
  }

  isValidPrivateKey(prv: string): boolean {
    try {
      return !!web3.eth.accounts.privateKeyToAccount(prv);
    } catch (e) {
      return false
    }
  }

  privateKeyToAddress(prv: string): string {
    let key: string
    if (prv.substring(0, 2) === '0x') {
      key = prv
    } else {
      key = `0x${prv}`
    }

    return web3.eth.accounts.privateKeyToAccount(key).address;
  }


  private _toMainDenominationString = createUnitConverters(DECIMAL_PLACES).toMainDenominationString

  private _toBaseDenominationString = createUnitConverters(DECIMAL_PLACES).toBaseDenominationString

  private async _getPayportValidationMessage(payport: Payport): Promise<string | undefined> {
    try {
      const { address } = payport
      if (!(await this.isValidAddress(address))) {
        return 'Invalid payport address'
      }
    } catch (e) {
      return 'Invalid payport address'
    }
    return undefined
  }
}
