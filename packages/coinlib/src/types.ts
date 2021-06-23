import * as t from 'io-ts'
import { extendCodec, Logger, optional } from '@faast/ts-common'
import { NetworkTypeT } from '@bitaccess/coinlib-common'
import { TronPaymentsConfig, BaseTronPaymentsConfig, TronPaymentsUtils } from '@bitaccess/coinlib-tron'
import { RipplePaymentsConfig, BaseRipplePaymentsConfig, RipplePaymentsUtils } from '@bitaccess/coinlib-ripple'
import { StellarPaymentsConfig, BaseStellarPaymentsConfig, StellarPaymentsUtils } from '@bitaccess/coinlib-stellar'
import { BitcoinPaymentsConfig, BaseBitcoinPaymentsConfig, BitcoinPaymentsUtils } from '@bitaccess/coinlib-bitcoin'
import { EthereumPaymentsConfig, BaseEthereumPaymentsConfig, EthereumPaymentsUtils } from '@bitaccess/coinlib-ethereum'
import { LitecoinPaymentsConfig, BaseLitecoinPaymentsConfig, LitecoinPaymentsUtils } from '@bitaccess/coinlib-litecoin'
import { BitcoinCashPaymentsConfig, BaseBitcoinCashPaymentsConfig, BitcoinCashPaymentsUtils } from '@bitaccess/coinlib-bitcoin-cash'
import { DogePaymentsConfig, BaseDogePaymentsConfig, DogePaymentsUtils } from '@bitaccess/coinlib-doge'

export type CoinPaymentsUtilsClasses = {
  TRX: TronPaymentsUtils,
  XRP: RipplePaymentsUtils,
  XLM: StellarPaymentsUtils,
  BTC: BitcoinPaymentsUtils,
  ETH: EthereumPaymentsUtils,
  LTC: LitecoinPaymentsUtils,
  BCH: BitcoinCashPaymentsUtils,
  DOGE: DogePaymentsUtils,
}

export const basePaymentsConfigCodecs = {
  TRX: BaseTronPaymentsConfig,
  XRP: BaseRipplePaymentsConfig,
  XLM: BaseStellarPaymentsConfig,
  BTC: BaseBitcoinPaymentsConfig,
  ETH: BaseEthereumPaymentsConfig,
  LTC: BaseLitecoinPaymentsConfig,
  BCH: BaseBitcoinCashPaymentsConfig,
  DOGE: BaseDogePaymentsConfig
}

export const CoinPaymentsBaseConfigs = t.type(basePaymentsConfigCodecs, 'CoinPaymentsBaseConfigs')
export type CoinPaymentsBaseConfigs = t.TypeOf<typeof CoinPaymentsBaseConfigs>

export const paymentsConfigCodecs = {
  TRX: TronPaymentsConfig,
  XRP: RipplePaymentsConfig,
  XLM: StellarPaymentsConfig,
  BTC: BitcoinPaymentsConfig,
  ETH: EthereumPaymentsConfig,
  LTC: LitecoinPaymentsConfig,
  BCH: BitcoinCashPaymentsConfig,
  DOGE: DogePaymentsConfig,
}
export const CoinPaymentsConfigs = t.type(paymentsConfigCodecs, 'CoinPaymentsConfigs')
export type CoinPaymentsConfigs = t.TypeOf<typeof CoinPaymentsConfigs>

export const SupportedCoinPaymentsSymbol = t.keyof(paymentsConfigCodecs, 'SupportedCoinPaymentsSymbol')
export type SupportedCoinPaymentsSymbol = t.TypeOf<typeof SupportedCoinPaymentsSymbol>

export type CoinPaymentsPartialConfigs = {
  [T in SupportedCoinPaymentsSymbol]?: Partial<CoinPaymentsConfigs[T]>
}
export const CoinPaymentsPartialConfigs = t.partial(
  basePaymentsConfigCodecs,
  'CoinPaymentsPartialConfigs',
) as t.Type<CoinPaymentsPartialConfigs>

export const CoinPaymentsConfig = extendCodec(
  CoinPaymentsPartialConfigs,
  {},
  {
    network: NetworkTypeT,
    logger: Logger,
    seed: t.string,
  },
  'CoinPaymentsConfig',
)
export type CoinPaymentsConfig = t.TypeOf<typeof CoinPaymentsConfig>
