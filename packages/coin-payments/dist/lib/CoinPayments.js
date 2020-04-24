import * as bip32 from 'bip32';
import * as bip39 from 'bip39';
import { assertType } from '@faast/ts-common';
import { NetworkType } from '@faast/payments-common';
import { CoinPaymentsConfig, SupportedCoinPaymentsSymbol, assetConfigCodecs, } from './types';
import { keysOf } from './utils';
import { SUPPORTED_ASSET_SYMBOLS, PAYMENTS_FACTORIES } from './constants';
function addSeedIfNecessary(network, seed, config) {
    const configCodec = assetConfigCodecs[network];
    let result = config;
    if (configCodec.is(result)) {
        return result;
    }
    result = {
        ...config,
        seed: seed.toString('hex')
    };
    if (configCodec.is(result)) {
        return result;
    }
    result = {
        ...config,
        hdKey: bip32.fromSeed(seed).toBase58(),
    };
    if (configCodec.is(result)) {
        return result;
    }
    throw new Error(`Invalid config provided for ${network}`);
}
export class CoinPayments {
    constructor(config) {
        this.config = config;
        this.payments = {};
        assertType(CoinPaymentsConfig, config);
        this.network = config.network || NetworkType.Mainnet;
        this.logger = config.logger || console;
        const seedBuffer = config.seed && (config.seed.includes(' ')
            ? bip39.mnemonicToSeedSync(config.seed)
            : Buffer.from(config.seed, 'hex'));
        const accountIdSet = new Set();
        SUPPORTED_ASSET_SYMBOLS.forEach((assetSymbol) => {
            let assetConfig = config[assetSymbol];
            if (seedBuffer) {
                assetConfig = addSeedIfNecessary(assetSymbol, seedBuffer, assetConfig || {});
            }
            if (!assetConfig) {
                return;
            }
            assetConfig = { ...assetConfig };
            if (config.network) {
                assetConfig.network = config.network;
            }
            if (config.logger) {
                assetConfig.logger = config.logger;
            }
            assertType(assetConfigCodecs[assetSymbol], assetConfig, `${assetSymbol} config`);
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
            const publicConfig = this.forAsset(k).getPublicConfig();
            if (publicConfig.seed) {
                delete publicConfig.seed;
            }
            if (publicConfig.hdKey && publicConfig.hdKey.startsWith('xprv')) {
                delete publicConfig.hdKey;
            }
            o[k] = publicConfig;
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