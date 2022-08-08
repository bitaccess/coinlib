import {
  AccountRipplePaymentsConfig,
  RippleSignatory,
  RippleAccountConfig,
  RippleKeyPair,
  RippleSecretPair,
} from './types'
import { BaseRipplePayments } from './BaseRipplePayments'
import { assertType } from '@bitaccess/ts-common'
import { isValidAddress } from './helpers'

export class AccountRipplePayments extends BaseRipplePayments<AccountRipplePaymentsConfig> {
  readOnly: boolean = false
  readonly hotSignatory: RippleSignatory
  readonly depositSignatory: RippleSignatory

  constructor(config: AccountRipplePaymentsConfig) {
    super(config)
    assertType(AccountRipplePaymentsConfig, config)
    this.hotSignatory = this.accountConfigToSignatory(config.hotAccount)
    this.depositSignatory = this.accountConfigToSignatory(config.depositAccount)
  }

  accountConfigToSignatory(accountConfig: RippleAccountConfig): RippleSignatory {
    if (RippleKeyPair.is(accountConfig)) {
      if (!accountConfig.privateKey) {
        this.readOnly = true
      }
      const address = this.api.deriveAddress(accountConfig.publicKey)
      return {
        address,
        secret: accountConfig,
      }
    } else if (RippleSecretPair.is(accountConfig)) {
      if (!accountConfig.secret) {
        this.readOnly = true
      }
      return accountConfig
    } else if (isValidAddress(accountConfig)) {
      this.readOnly = true
      return {
        address: accountConfig,
        secret: '',
      }
    }
    throw new Error('Invalid ripple account config provided to ripple payments')
  }

  isReadOnly() {
    return this.readOnly
  }

  getPublicAccountConfig(): AccountRipplePaymentsConfig {
    return {
      hotAccount: this.hotSignatory.address,
      depositAccount: this.depositSignatory.address,
    }
  }

  getAccountIds(): string[] {
    return [this.hotSignatory.address, this.depositSignatory.address]
  }

  getAccountId(index: number): string {
    if (index < 0) {
      throw new Error(`Invalid ripple payments accountId index ${index}`)
    }
    if (index === 0) {
      return this.hotSignatory.address
    }
    return this.depositSignatory.address
  }

  getHotSignatory() {
    return this.hotSignatory
  }

  getDepositSignatory() {
    return this.depositSignatory
  }
}
