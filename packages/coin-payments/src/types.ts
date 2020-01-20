import * as t from 'io-ts'
import { extendCodec, Logger } from '@faast/ts-common'
import { NetworkTypeT } from '@faast/payments-common'
import { TronPaymentsConfig } from '@faast/tron-payments'
import { RipplePaymentsConfig } from '@faast/ripple-payments'
import { StellarPaymentsConfig } from '@faast/stellar-payments'
import { BitcoinPaymentsConfig } from '@faast/bitcoin-payments'

const assetConfigCodecs = {
  TRX: TronPaymentsConfig,
  XRP: RipplePaymentsConfig,
  XLM: StellarPaymentsConfig,
  BTC: BitcoinPaymentsConfig,
}
export const CoinPaymentsAssetConfigs = t.type(assetConfigCodecs, 'CoinPaymentsAssetConfigs')
export type CoinPaymentsAssetConfigs = t.TypeOf<typeof CoinPaymentsAssetConfigs>

export const CoinPaymentsConfig = t.partial(
  {
    ...assetConfigCodecs,
    network: NetworkTypeT,
    logger: Logger,
    seed: t.string,
  },
  'CoinPaymentsConfig',
)
export type CoinPaymentsConfig = t.TypeOf<typeof CoinPaymentsConfig>

export const SupportedCoinPaymentsSymbol = t.keyof(assetConfigCodecs, 'SupportedCoinPaymentsSymbol')
export type SupportedCoinPaymentsSymbol = t.TypeOf<typeof SupportedCoinPaymentsSymbol>
