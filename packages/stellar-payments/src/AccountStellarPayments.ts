import {
  AccountStellarPaymentsConfig,
  StellarSignatory,
  StellarAccountConfig,
  StellarKeyPair,
  StellarSecretPair,
} from './types'
import { BaseStellarPayments } from './BaseStellarPayments'
import { assertType } from '@faast/ts-common'
import { isValidAddress } from './helpers'

export class AccountStellarPayments extends BaseStellarPayments<AccountStellarPaymentsConfig> {
  readOnly: boolean = false
  readonly hotSignatory: StellarSignatory
  readonly depositSignatory: StellarSignatory

  constructor(config: AccountStellarPaymentsConfig) {
    super(config)
    assertType(AccountStellarPaymentsConfig, config)
    this.hotSignatory = this.accountConfigToSignatory(config.hotAccount)
    this.depositSignatory = this.accountConfigToSignatory(config.depositAccount)
  }

  accountConfigToSignatory(accountConfig: StellarAccountConfig): StellarSignatory {
    if (StellarKeyPair.is(accountConfig)) {
      if (!accountConfig.privateKey) {
        this.readOnly = true
      }
      const address = this.stellarApi.deriveAddress(accountConfig.publicKey)
      return {
        address,
        secret: accountConfig,
      }
    } else if (StellarSecretPair.is(accountConfig)) {
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
    throw new Error('Invalid stellar account config provided to stellar payments')
  }

  isReadOnly() {
    return this.readOnly
  }

  getPublicAccountConfig(): AccountStellarPaymentsConfig {
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
      throw new Error(`Invalid stellar payments accountId index ${index}`)
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
