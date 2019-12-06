import * as t from 'io-ts'
import { TronPaymentsConfig } from '@faast/tron-payments'
import { RipplePaymentsConfig } from '@faast/ripple-payments'
import { StellarPaymentsConfig } from '@faast/stellar-payments'

const coinPaymentsConfigProps = {
  TRX: TronPaymentsConfig,
  XRP: RipplePaymentsConfig,
  XLM: StellarPaymentsConfig,
}
export const CoinPaymentsConfig = t.type(coinPaymentsConfigProps, 'CoinPaymentsConfig')
export type CoinPaymentsConfig = t.TypeOf<typeof CoinPaymentsConfig>

export const CoinPaymentsConfigPartial = t.partial(coinPaymentsConfigProps, 'CoinPaymentsConfigPartial')
export type CoinPaymentsConfigPartial = t.TypeOf<typeof CoinPaymentsConfigPartial>

export const SupportedCoinPaymentsSymbol = t.keyof(coinPaymentsConfigProps, 'SupportedCoinPaymentsSymbol')
export type SupportedCoinPaymentsSymbol = t.TypeOf<typeof SupportedCoinPaymentsSymbol>
