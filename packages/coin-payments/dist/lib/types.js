import * as t from 'io-ts';
import { Logger } from '@faast/ts-common';
import { NetworkTypeT } from '@faast/payments-common';
import { TronPaymentsConfig } from '@faast/tron-payments';
import { RipplePaymentsConfig } from '@faast/ripple-payments';
import { StellarPaymentsConfig } from '@faast/stellar-payments';
const assetConfigCodecs = {
    TRX: TronPaymentsConfig,
    XRP: RipplePaymentsConfig,
    XLM: StellarPaymentsConfig,
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