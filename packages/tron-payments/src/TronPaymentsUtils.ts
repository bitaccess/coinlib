import { PaymentsUtils, BaseConfig, NetworkType, Payport } from '@faast/payments-common'
import {
  toMainDenominationString,
  toBaseDenominationString,
  isValidXprv,
  isValidXpub,
  isValidAddress,
  isValidExtraId,
  isValidPayport,
  isValidPrivateKey,
  privateKeyToAddress,
} from './helpers'
import { Logger, DelegateLogger, isNil, assertType } from '@faast/ts-common'
import { PACKAGE_NAME } from './constants'

export class TronPaymentsUtils implements PaymentsUtils {
  networkType: NetworkType
  logger: Logger

  constructor(config: BaseConfig = {}) {
    assertType(BaseConfig, config)
    this.networkType = config.network || NetworkType.Mainnet
    this.logger = new DelegateLogger(config.logger, PACKAGE_NAME)
  }

  async isValidExtraId(extraId: string): Promise<boolean> {
    return isValidExtraId(extraId)
  }

  async isValidAddress(address: string): Promise<boolean> {
    return isValidAddress(address)
  }

  async isValidPayport(payport: Payport): Promise<boolean> {
    return isValidPayport(payport)
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
}
