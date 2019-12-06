import { PaymentsFactory, AnyPayments } from '@faast/payments-common'
import { TronPaymentsFactory } from '@faast/tron-payments'
import { RipplePaymentsFactory } from '@faast/ripple-payments'
import { StellarPaymentsFactory } from '@faast/stellar-payments'

import { CoinPaymentsConfig, SupportedCoinPaymentsSymbol, CoinPaymentsConfigPartial } from './types'
import { keysOf } from './utils'
import { assertType } from '@faast/ts-common';

const paymentsFactories: {
  [A in SupportedCoinPaymentsSymbol]: PaymentsFactory
} = {
  TRX: new TronPaymentsFactory(),
  XRP: new RipplePaymentsFactory(),
  XLM: new StellarPaymentsFactory(),
}

export class CoinPayments {
  readonly payments: { [A in SupportedCoinPaymentsSymbol]?: AnyPayments } = {}
  readonly accountIds: string[]

  constructor(public readonly config: CoinPaymentsConfigPartial) {
    assertType(CoinPaymentsConfigPartial, config)
    const accountIdSet = new Set<string>()
    keysOf(config).forEach((assetSymbol) => {
      const assetConfig = config[assetSymbol]
      if (!assetConfig) {
        return
      }
      const assetPayments = paymentsFactories[assetSymbol].forConfig(assetConfig)
      this.payments[assetSymbol] = assetPayments
      assetPayments.getAccountIds().forEach((id) => accountIdSet.add(id))
    })
    this.accountIds = Array.from(accountIdSet)
  }

  static getFactory(assetSymbol: SupportedCoinPaymentsSymbol): PaymentsFactory {
    const paymentsFactory = paymentsFactories[assetSymbol]
    if (!paymentsFactory) {
      throw new Error(`No payment factory configured for asset symbol ${assetSymbol}`)
    }
    return paymentsFactory
  }

  static getPayments<A extends SupportedCoinPaymentsSymbol>(
    assetSymbol: A,
    config: CoinPaymentsConfig[A],
  ): AnyPayments {
    const factory = CoinPayments.getFactory(assetSymbol)
    return factory.forConfig(config)
  }

  getAccountIds(): string[] {
    return this.accountIds
  }

  forAsset(assetSymbol: SupportedCoinPaymentsSymbol): AnyPayments {
    const assetPayments = this.payments[assetSymbol]
    if (!assetPayments) {
      throw new Error(`No payments interface configured for ${assetSymbol}`)
    }
    return assetPayments
  }

  isAssetSupported(assetSymbol: string): assetSymbol is SupportedCoinPaymentsSymbol {
    return SupportedCoinPaymentsSymbol.is(assetSymbol)
  }

  isAssetConfigured(assetSymbol: SupportedCoinPaymentsSymbol): boolean {
    return Boolean(this.payments[assetSymbol])
  }

}

export default CoinPayments
