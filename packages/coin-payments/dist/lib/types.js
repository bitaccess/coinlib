import * as t from 'io-ts';
import { Logger } from '@faast/ts-common';
import { NetworkTypeT } from '@faast/payments-common';
import { TronPaymentsConfig, BaseTronPaymentsConfig } from '@faast/tron-payments';
import { RipplePaymentsConfig, BaseRipplePaymentsConfig } from '@faast/ripple-payments';
import { StellarPaymentsConfig, BaseStellarPaymentsConfig } from '@faast/stellar-payments';
import { BitcoinPaymentsConfig, BaseBitcoinPaymentsConfig } from '@faast/bitcoin-payments';
const baseAssetConfigCodecs = {
    TRX: BaseTronPaymentsConfig,
    XRP: BaseRipplePaymentsConfig,
    XLM: BaseStellarPaymentsConfig,
    BTC: BaseBitcoinPaymentsConfig,
};
export const CoinPaymentsBaseAssetConfigs = t.type(baseAssetConfigCodecs, 'CoinPaymentsBaseAssetConfigs');
const assetConfigCodecs = {
    TRX: TronPaymentsConfig,
    XRP: RipplePaymentsConfig,
    XLM: StellarPaymentsConfig,
    BTC: BitcoinPaymentsConfig,
};
export const CoinPaymentsAssetConfigs = t.type(assetConfigCodecs, 'CoinPaymentsAssetConfigs');
export const CoinPaymentsConfig = t.partial({
    ...assetConfigCodecs,
    network: NetworkTypeT,
    logger: Logger,
    seed: t.string,
}, 'CoinPaymentsConfig');
export const SupportedCoinPaymentsSymbol = t.keyof(assetConfigCodecs, 'SupportedCoinPaymentsSymbol');
//# sourceMappingURL=types.js.map