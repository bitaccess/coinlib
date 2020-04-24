import * as t from 'io-ts';
import { extendCodec, Logger } from '@faast/ts-common';
import { NetworkTypeT } from '@faast/payments-common';
import { TronPaymentsConfig, BaseTronPaymentsConfig } from '@faast/tron-payments';
import { RipplePaymentsConfig, BaseRipplePaymentsConfig } from '@faast/ripple-payments';
import { StellarPaymentsConfig, BaseStellarPaymentsConfig } from '@faast/stellar-payments';
import { BitcoinPaymentsConfig, BaseBitcoinPaymentsConfig } from '@faast/bitcoin-payments';
import { EthereumPaymentsConfig, BaseEthereumPaymentsConfig } from '@faast/ethereum-payments';
export const baseAssetConfigCodecs = {
    TRX: BaseTronPaymentsConfig,
    XRP: BaseRipplePaymentsConfig,
    XLM: BaseStellarPaymentsConfig,
    BTC: BaseBitcoinPaymentsConfig,
    ETH: BaseEthereumPaymentsConfig,
};
export const CoinPaymentsBaseAssetConfigs = t.type(baseAssetConfigCodecs, 'CoinPaymentsBaseAssetConfigs');
export const assetConfigCodecs = {
    TRX: TronPaymentsConfig,
    XRP: RipplePaymentsConfig,
    XLM: StellarPaymentsConfig,
    BTC: BitcoinPaymentsConfig,
    ETH: EthereumPaymentsConfig,
};
export const CoinPaymentsAssetConfigs = t.type(assetConfigCodecs, 'CoinPaymentsAssetConfigs');
export const SupportedCoinPaymentsSymbol = t.keyof(assetConfigCodecs, 'SupportedCoinPaymentsSymbol');
export const CoinPaymentsPartialAssetConfigs = t.partial(baseAssetConfigCodecs, 'CoinPaymentsPartialAssetConfigs');
export const CoinPaymentsConfig = extendCodec(CoinPaymentsPartialAssetConfigs, {}, {
    network: NetworkTypeT,
    logger: Logger,
    seed: t.string,
}, 'CoinPaymentsConfig');
//# sourceMappingURL=types.js.map