import { type, partial, string, keyof } from 'io-ts';
import { Logger, assertType } from '@faast/ts-common';
import { NetworkTypeT, NetworkType } from '@faast/payments-common';
export * from '@faast/payments-common';
import { BaseTronPaymentsConfig, TronPaymentsConfig, TronPaymentsFactory } from '@faast/tron-payments';
import * as tronPayments from '@faast/tron-payments';
export { tronPayments as Tron };
import { BaseRipplePaymentsConfig, RipplePaymentsConfig, RipplePaymentsFactory } from '@faast/ripple-payments';
import * as ripplePayments from '@faast/ripple-payments';
export { ripplePayments as Ripple };
import { BaseStellarPaymentsConfig, StellarPaymentsConfig, StellarPaymentsFactory } from '@faast/stellar-payments';
import * as stellarPayments from '@faast/stellar-payments';
export { stellarPayments as Stellar };
import { BaseBitcoinPaymentsConfig, BitcoinPaymentsConfig, BitcoinPaymentsFactory } from '@faast/bitcoin-payments';
import * as bitcoinPayments from '@faast/bitcoin-payments';
export { bitcoinPayments as Bitcoin };
import { fromSeed } from 'bip32';

const baseAssetConfigCodecs = {
    TRX: BaseTronPaymentsConfig,
    XRP: BaseRipplePaymentsConfig,
    XLM: BaseStellarPaymentsConfig,
    BTC: BaseBitcoinPaymentsConfig,
};
const CoinPaymentsBaseAssetConfigs = type(baseAssetConfigCodecs, 'CoinPaymentsBaseAssetConfigs');
const assetConfigCodecs = {
    TRX: TronPaymentsConfig,
    XRP: RipplePaymentsConfig,
    XLM: StellarPaymentsConfig,
    BTC: BitcoinPaymentsConfig,
};
const CoinPaymentsAssetConfigs = type(assetConfigCodecs, 'CoinPaymentsAssetConfigs');
const CoinPaymentsConfig = partial({
    ...assetConfigCodecs,
    network: NetworkTypeT,
    logger: Logger,
    seed: string,
}, 'CoinPaymentsConfig');
const SupportedCoinPaymentsSymbol = keyof(assetConfigCodecs, 'SupportedCoinPaymentsSymbol');

function keysOf(o) {
    return Object.keys(o);
}

const PAYMENTS_FACTORIES = {
    TRX: new TronPaymentsFactory(),
    XRP: new RipplePaymentsFactory(),
    XLM: new StellarPaymentsFactory(),
    BTC: new BitcoinPaymentsFactory(),
};
const SUPPORTED_ASSET_SYMBOLS = keysOf(PAYMENTS_FACTORIES);

class CoinPayments {
    constructor(config) {
        this.config = config;
        this.payments = {};
        assertType(CoinPaymentsConfig, config);
        this.network = config.network || NetworkType.Mainnet;
        this.logger = config.logger || console;
        const accountIdSet = new Set();
        SUPPORTED_ASSET_SYMBOLS.forEach((assetSymbol) => {
            let assetConfig = config[assetSymbol];
            if (!assetConfig && config.seed) {
                const xprv = fromSeed(Buffer.from(config.seed, 'hex')).toBase58();
                assetConfig = {
                    seed: config.seed,
                    hdKey: xprv,
                };
            }
            if (!assetConfig) {
                return;
            }
            if (config.network) {
                assetConfig.network = config.network;
            }
            if (config.logger) {
                assetConfig.logger = config.logger;
            }
            const assetPayments = PAYMENTS_FACTORIES[assetSymbol].forConfig(assetConfig);
            this.payments[assetSymbol] = assetPayments;
            assetPayments.getAccountIds().forEach((id) => accountIdSet.add(id));
        });
        this.accountIds = Array.from(accountIdSet);
    }
    static getFactory(assetSymbol) {
        const paymentsFactory = PAYMENTS_FACTORIES[assetSymbol];
        if (!paymentsFactory) {
            throw new Error(`No payment factory configured for asset symbol ${assetSymbol}`);
        }
        return paymentsFactory;
    }
    static getPayments(assetSymbol, config) {
        const factory = CoinPayments.getFactory(assetSymbol);
        return factory.forConfig(config);
    }
    getPublicConfig() {
        return keysOf(this.payments).reduce((o, k) => {
            o[k] = this.forAsset(k).getPublicConfig();
            return o;
        }, {});
    }
    getAccountIds() {
        return this.accountIds;
    }
    forAsset(assetSymbol) {
        const assetPayments = this.payments[assetSymbol];
        if (!assetPayments) {
            throw new Error(`No payments interface configured for ${assetSymbol}`);
        }
        return assetPayments;
    }
    isAssetSupported(assetSymbol) {
        return SupportedCoinPaymentsSymbol.is(assetSymbol);
    }
    isAssetConfigured(assetSymbol) {
        return Boolean(this.payments[assetSymbol]);
    }
}

export { CoinPayments, CoinPaymentsAssetConfigs, CoinPaymentsBaseAssetConfigs, CoinPaymentsConfig, PAYMENTS_FACTORIES, SUPPORTED_ASSET_SYMBOLS, SupportedCoinPaymentsSymbol };
//# sourceMappingURL=index.es.js.map
