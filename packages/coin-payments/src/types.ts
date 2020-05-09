import * as t from 'io-ts'
import { extendCodec, Logger, optional } from '@faast/ts-common'
import { NetworkTypeT } from '@faast/payments-common'
import { TronPaymentsConfig, BaseTronPaymentsConfig } from '@faast/tron-payments'
import { RipplePaymentsConfig, BaseRipplePaymentsConfig } from '@faast/ripple-payments'
import { StellarPaymentsConfig, BaseStellarPaymentsConfig } from '@faast/stellar-payments'
import { BitcoinPaymentsConfig, BaseBitcoinPaymentsConfig } from '@faast/bitcoin-payments'
import { EthereumPaymentsConfig, BaseEthereumPaymentsConfig, Erc20PaymentsConfig, BaseErc20PaymentsConfig  } from '@faast/ethereum-payments'

export const baseAssetConfigCodecs = {
  TRX: BaseTronPaymentsConfig,
  XRP: BaseRipplePaymentsConfig,
  XLM: BaseStellarPaymentsConfig,
  BTC: BaseBitcoinPaymentsConfig,
  ETH: BaseEthereumPaymentsConfig,
  LINK: BaseErc20PaymentsConfig,
}

export const CoinPaymentsBaseAssetConfigs = t.type(baseAssetConfigCodecs, 'CoinPaymentsBaseAssetConfigs')
export type CoinPaymentsBaseAssetConfigs = t.TypeOf<typeof CoinPaymentsBaseAssetConfigs>

export const assetConfigCodecs = {
  TRX: TronPaymentsConfig,
  XRP: RipplePaymentsConfig,
  XLM: StellarPaymentsConfig,
  BTC: BitcoinPaymentsConfig,
  ETH: EthereumPaymentsConfig,
  LINK: Erc20PaymentsConfig,
}
export const CoinPaymentsAssetConfigs = t.type(assetConfigCodecs, 'CoinPaymentsAssetConfigs')
export type CoinPaymentsAssetConfigs = t.TypeOf<typeof CoinPaymentsAssetConfigs>

export const SupportedCoinPaymentsSymbol = t.keyof(assetConfigCodecs, 'SupportedCoinPaymentsSymbol')
export type SupportedCoinPaymentsSymbol = t.TypeOf<typeof SupportedCoinPaymentsSymbol>

export type CoinPaymentsPartialAssetConfigs = {
  [T in SupportedCoinPaymentsSymbol]?: Partial<CoinPaymentsAssetConfigs[T]>
}
export const CoinPaymentsPartialAssetConfigs = t.partial(
  baseAssetConfigCodecs,
  'CoinPaymentsPartialAssetConfigs',
) as t.Type<CoinPaymentsPartialAssetConfigs>

export const CoinPaymentsConfig = extendCodec(
  CoinPaymentsPartialAssetConfigs,
  {},
  {
    network: NetworkTypeT,
    logger: Logger,
    seed: t.string,
  },
  'CoinPaymentsConfig',
)
export type CoinPaymentsConfig = t.TypeOf<typeof CoinPaymentsConfig>
