import { PaymentsUtils, BaseConfig, NetworkType, Payport } from '@faast/payments-common'
import {
  toMainDenominationString,
  toBaseDenominationString,
  isValidXprv,
  isValidXpub,
  isValidAddress,
  isValidExtraId,
} from './utils'
import { Logger, DelegateLogger } from '@faast/ts-common'
import { PACKAGE_NAME } from './constants'

export class RipplePaymentsUtils implements PaymentsUtils {
  networkType: NetworkType
  logger: Logger

  constructor(config: BaseConfig) {
    this.networkType = config.network || NetworkType.Mainnet
    this.logger = new DelegateLogger(config.logger, PACKAGE_NAME)
  }

  async isValidExtraId(extraId: string): Promise<boolean> {
    return isValidExtraId(extraId)
  }

  async isValidAddress(address: string): Promise<boolean> {
    return isValidAddress(address)
  }

  async isValidPayport({ address, extraId }: Payport): Promise<boolean> {
    return (await this.isValidAddress(address)) && (typeof extraId === 'string' ? this.isValidExtraId(extraId) : true)
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
