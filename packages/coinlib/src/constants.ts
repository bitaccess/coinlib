import { TronPaymentsFactory } from '@bitaccess/coinlib-tron'
import { RipplePaymentsFactory } from '@bitaccess/coinlib-ripple'
import { StellarPaymentsFactory } from '@bitaccess/coinlib-stellar'
import { BitcoinPaymentsFactory } from '@bitaccess/coinlib-bitcoin'
import { EthereumPaymentsFactory } from '@bitaccess/coinlib-ethereum'
import { LitecoinPaymentsFactory } from '@bitaccess/coinlib-litecoin'
import { BitcoinCashPaymentsFactory } from '@bitaccess/coinlib-bitcoin-cash'
import { DogePaymentsFactory } from '@bitaccess/coinlib-doge'
import { keysOf } from '@bitaccess/coinlib-common'

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
