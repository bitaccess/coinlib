import { PaymentsFactory } from '@faast/payments-common'
import { TronPaymentsFactory } from '@faast/tron-payments'
import { RipplePaymentsFactory } from '@faast/ripple-payments'
import { StellarPaymentsFactory } from '@faast/stellar-payments'
import { BitcoinPaymentsFactory } from '@faast/bitcoin-payments'
import { EthereumPaymentsFactory } from '@faast/ethereum-payments'
import { LitecoinPaymentsFactory } from '@faast/litecoin-payments'
import { BitcoinCashPaymentsFactory } from '@faast/bitcoin-cash-payments'
import { DashPaymentsFactory } from '@faast/dash-payments'

import { keysOf } from './utils'
import { SupportedCoinPaymentsSymbol } from './types'

export const PAYMENTS_FACTORIES: {
  [A in SupportedCoinPaymentsSymbol]: PaymentsFactory
} = {
  TRX: new TronPaymentsFactory(),
  XRP: new RipplePaymentsFactory(),
  XLM: new StellarPaymentsFactory(),
  BTC: new BitcoinPaymentsFactory(),
  ETH: new EthereumPaymentsFactory(),
  LTC: new LitecoinPaymentsFactory(),
  BCH: new BitcoinCashPaymentsFactory(),
  DASH: new DashPaymentsFactory(),
}

export const SUPPORTED_NETWORK_SYMBOLS = keysOf(PAYMENTS_FACTORIES)

/** @deprecated use SUPPORTED_NETWORK_SYMBOLS instead */
export const SUPPORTED_ASSET_SYMBOLS = SUPPORTED_NETWORK_SYMBOLS
