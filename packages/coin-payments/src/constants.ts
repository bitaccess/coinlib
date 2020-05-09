import { PaymentsFactory } from '@faast/payments-common'
import { TronPaymentsFactory } from '@faast/tron-payments'
import { RipplePaymentsFactory } from '@faast/ripple-payments'
import { StellarPaymentsFactory } from '@faast/stellar-payments'
import { BitcoinPaymentsFactory } from '@faast/bitcoin-payments'
import { EthereumPaymentsFactory, Erc20PaymentsFactory } from '@faast/ethereum-payments'

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
  LINK: new Erc20PaymentsFactory(),
}

export const SUPPORTED_ASSET_SYMBOLS = keysOf(PAYMENTS_FACTORIES)
