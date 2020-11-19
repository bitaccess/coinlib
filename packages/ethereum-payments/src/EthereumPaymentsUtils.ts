import Web3 from 'web3'
const web3 = new Web3()
import { BigNumber } from 'bignumber.js'

import { PaymentsUtils, Payport, createUnitConverters } from '@faast/payments-common'
import {
  Numeric,
  Logger,
  DelegateLogger,
  isNil,
  assertType
} from '@faast/ts-common'
import { PACKAGE_NAME, DECIMAL_PLACES } from './constants'
import {
  BaseEthereumPaymentsConfig,
  BaseDenominationOptions,
} from './types'
import { isValidXkey } from './bip44'

type UnitConverters = ReturnType<typeof createUnitConverters>

export class EthereumPaymentsUtils implements PaymentsUtils {
  logger: Logger
  decimals: number

  constructor(config: BaseEthereumPaymentsConfig) {
    this.logger = new DelegateLogger(config.logger, PACKAGE_NAME)
    this.decimals = isNil(config.decimals) ? DECIMAL_PLACES : config.decimals

    const unitConverters = createUnitConverters(this.decimals)
    this.toMainDenominationBigNumber = unitConverters.toMainDenominationBigNumber
    this.toBaseDenominationBigNumber = unitConverters.toBaseDenominationBigNumber
    this.toMainDenomination = unitConverters.toMainDenominationString
    this.toBaseDenomination = unitConverters.toBaseDenominationString

    const ethUnitConverters = createUnitConverters(DECIMAL_PLACES)
    this.toMainDenominationBigNumberEth = ethUnitConverters.toMainDenominationBigNumber
    this.toBaseDenominationBigNumberEth = ethUnitConverters.toBaseDenominationBigNumber
    this.toMainDenominationEth = ethUnitConverters.toMainDenominationString
    this.toBaseDenominationEth = ethUnitConverters.toBaseDenominationString
  }

  toMainDenominationBigNumber: UnitConverters['toMainDenominationBigNumber']
  toBaseDenominationBigNumber: UnitConverters['toMainDenominationBigNumber']
  toMainDenomination: UnitConverters['toMainDenominationString']
  toBaseDenomination: UnitConverters['toBaseDenominationString']

  toMainDenominationBigNumberEth: UnitConverters['toMainDenominationBigNumber']
  toBaseDenominationBigNumberEth: UnitConverters['toMainDenominationBigNumber']
  toMainDenominationEth: UnitConverters['toMainDenominationString']
  toBaseDenominationEth: UnitConverters['toBaseDenominationString']

  async isValidAddress(address: string): Promise<boolean> {
    return web3.utils.isAddress(address)
  }

  async isValidExtraId(extraId: unknown): Promise<boolean> {
    return false
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
      return !!web3.eth.accounts.privateKeyToAccount(prv)
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

    return web3.eth.accounts.privateKeyToAccount(key).address.toLowerCase()
  }

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
