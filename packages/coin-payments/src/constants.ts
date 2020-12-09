import { TronPaymentsFactory } from '@faast/tron-payments'
import { RipplePaymentsFactory } from '@faast/ripple-payments'
import { StellarPaymentsFactory } from '@faast/stellar-payments'
import { BitcoinPaymentsFactory } from '@faast/bitcoin-payments'
import { EthereumPaymentsFactory } from '@faast/ethereum-payments'
import { LitecoinPaymentsFactory } from '@faast/litecoin-payments'
import { BitcoinCashPaymentsFactory } from '@faast/bitcoin-cash-payments'
import { DogePaymentsFactory } from '@faast/doge-payments'

import { keysOf } from './utils'

export const PAYMENTS_FACTORIES = {
  TRX: new TronPaymentsFactory(),
  XRP: new RipplePaymentsFactory(),
  XLM: new StellarPaymentsFactory(),
  BTC: new BitcoinPaymentsFactory(),
  ETH: new EthereumPaymentsFactory(),
  LTC: new LitecoinPaymentsFactory(),
  BCH: new BitcoinCashPaymentsFactory(),
  DOGE: new DogePaymentsFactory(),
}

export const SUPPORTED_NETWORK_SYMBOLS = keysOf(PAYMENTS_FACTORIES)
