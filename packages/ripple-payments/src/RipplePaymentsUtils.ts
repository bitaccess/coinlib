import { PaymentsUtils, BaseConfig, NetworkType, Payport } from '@faast/payments-common'
import {
  toMainDenominationString,
  toBaseDenominationString,
  isValidXprv,
  isValidXpub,
  isValidAddress,
  isValidExtraId,
} from './helpers'
import { Logger, DelegateLogger, isNil } from '@faast/ts-common'
import { PACKAGE_NAME } from './constants'

export class RipplePaymentsUtils implements PaymentsUtils {
  networkType: NetworkType
  logger: Logger

  constructor(config: BaseConfig = {}) {
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
    if (!Payport.is(payport)) {
      return false
    }
    const { address, extraId } = payport
    return (await this.isValidAddress(address)) && (isNil(extraId) ? true : this.isValidExtraId(extraId))
  }

  toMainDenomination(amount: string | number): string {
    return toMainDenominationString(amount)
  }

  toBaseDenomination(amount: string | number): string {
    return toBaseDenominationString(amount)
  }

  isValidXprv = isValidXprv
  isValidXpub = isValidXpub
}
