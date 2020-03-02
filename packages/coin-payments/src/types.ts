import * as t from 'io-ts'
import { extendCodec, Logger } from '@faast/ts-common'
import { NetworkTypeT } from '@faast/payments-common'
import { TronPaymentsConfig, BaseTronPaymentsConfig } from '@faast/tron-payments'
import { RipplePaymentsConfig, BaseRipplePaymentsConfig } from '@faast/ripple-payments'
import { StellarPaymentsConfig, BaseStellarPaymentsConfig } from '@faast/stellar-payments'
import { BitcoinPaymentsConfig, BaseBitcoinPaymentsConfig } from '@faast/bitcoin-payments'
import { EthereumPaymentsConfig, BaseEthereumPaymentsConfig } from '@faast/ethereum-payments'

const baseAssetConfigCodecs = {
  TRX: BaseTronPaymentsConfig,
  XRP: BaseRipplePaymentsConfig,
  XLM: BaseStellarPaymentsConfig,
  BTC: BaseBitcoinPaymentsConfig,
  ETH: BaseEthereumPaymentsConfig,
}

export const CoinPaymentsBaseAssetConfigs = t.type(baseAssetConfigCodecs, 'CoinPaymentsBaseAssetConfigs')
export type CoinPaymentsBaseAssetConfigs = t.TypeOf<typeof CoinPaymentsBaseAssetConfigs>

const assetConfigCodecs = {
  TRX: TronPaymentsConfig,
  XRP: RipplePaymentsConfig,
  XLM: StellarPaymentsConfig,
  BTC: BitcoinPaymentsConfig,
  ETH: EthereumPaymentsConfig,
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
