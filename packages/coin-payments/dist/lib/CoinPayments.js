import * as bip32 from 'bip32';
import { assertType } from '@faast/ts-common';
import { NetworkType } from '@faast/payments-common';
import { CoinPaymentsConfig, SupportedCoinPaymentsSymbol } from './types';
import { keysOf } from './utils';
import { SUPPORTED_ASSET_SYMBOLS, PAYMENTS_FACTORIES } from './constants';
export class CoinPayments {
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
                const xprv = bip32.fromSeed(Buffer.from(config.seed, 'hex')).toBase58();
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
export default CoinPayments;
//# sourceMappingURL=CoinPayments.js.map