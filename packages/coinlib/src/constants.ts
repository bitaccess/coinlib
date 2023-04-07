import { TronPaymentsFactory } from '@bitaccess/coinlib-tron'
import { RipplePaymentsFactory } from '@bitaccess/coinlib-ripple'
import { StellarPaymentsFactory } from '@bitaccess/coinlib-stellar'
import { BitcoinPaymentsFactory } from '@bitaccess/coinlib-bitcoin'
import { EthereumPaymentsFactory } from '@bitaccess/coinlib-ethereum'
import { LitecoinPaymentsFactory } from '@bitaccess/coinlib-litecoin'
import { BitcoinCashPaymentsFactory } from '@bitaccess/coinlib-bitcoin-cash'
import { DogePaymentsFactory } from '@bitaccess/coinlib-doge'

export { SUPPORTED_NETWORK_SYMBOLS } from '@bitaccess/coinlib-common'

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
