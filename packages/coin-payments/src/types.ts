import * as t from 'io-ts'
import { extendCodec, Logger, optional } from '@faast/ts-common'
import { NetworkTypeT } from '@faast/payments-common'
import { TronPaymentsConfig, BaseTronPaymentsConfig } from '@faast/tron-payments'
import { RipplePaymentsConfig, BaseRipplePaymentsConfig } from '@faast/ripple-payments'
import { StellarPaymentsConfig, BaseStellarPaymentsConfig } from '@faast/stellar-payments'
import { BitcoinPaymentsConfig, BaseBitcoinPaymentsConfig } from '@faast/bitcoin-payments'
import { EthereumPaymentsConfig, BaseEthereumPaymentsConfig } from '@faast/ethereum-payments'
import { LitecoinPaymentsConfig, BaseLitecoinPaymentsConfig } from '@faast/litecoin-payments'

export const basePaymentsConfigCodecs = {
  TRX: BaseTronPaymentsConfig,
  XRP: BaseRipplePaymentsConfig,
  XLM: BaseStellarPaymentsConfig,
  BTC: BaseBitcoinPaymentsConfig,
  ETH: BaseEthereumPaymentsConfig,
  LTC: BaseLitecoinPaymentsConfig,
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
