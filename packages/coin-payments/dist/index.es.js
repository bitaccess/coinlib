import { type, keyof, partial, string } from 'io-ts';
import { extendCodec, Logger, assertType } from '@faast/ts-common';
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
import { BaseEthereumPaymentsConfig, EthereumPaymentsConfig, EthereumPaymentsFactory } from '@faast/ethereum-payments';
import { fromSeed } from 'bip32';
import { mnemonicToSeedSync } from 'bip39';

const baseAssetConfigCodecs = {
    TRX: BaseTronPaymentsConfig,
    XRP: BaseRipplePaymentsConfig,
    XLM: BaseStellarPaymentsConfig,
    BTC: BaseBitcoinPaymentsConfig,
    ETH: BaseEthereumPaymentsConfig,
};
const CoinPaymentsBaseAssetConfigs = type(baseAssetConfigCodecs, 'CoinPaymentsBaseAssetConfigs');
const assetConfigCodecs = {
    TRX: TronPaymentsConfig,
    XRP: RipplePaymentsConfig,
    XLM: StellarPaymentsConfig,
    BTC: BitcoinPaymentsConfig,
    ETH: EthereumPaymentsConfig,
};
const CoinPaymentsAssetConfigs = type(assetConfigCodecs, 'CoinPaymentsAssetConfigs');
const SupportedCoinPaymentsSymbol = keyof(assetConfigCodecs, 'SupportedCoinPaymentsSymbol');
const CoinPaymentsPartialAssetConfigs = partial(baseAssetConfigCodecs, 'CoinPaymentsPartialAssetConfigs');
const CoinPaymentsConfig = extendCodec(CoinPaymentsPartialAssetConfigs, {}, {
    network: NetworkTypeT,
    logger: Logger,
    seed: string,
}, 'CoinPaymentsConfig');

function keysOf(o) {
    return Object.keys(o);
}

const PAYMENTS_FACTORIES = {
    TRX: new TronPaymentsFactory(),
    XRP: new RipplePaymentsFactory(),
    XLM: new StellarPaymentsFactory(),
    BTC: new BitcoinPaymentsFactory(),
    ETH: new EthereumPaymentsFactory(),
};
const SUPPORTED_ASSET_SYMBOLS = keysOf(PAYMENTS_FACTORIES);

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
        hdKey: fromSeed(seed).toBase58(),
    };
    if (configCodec.is(result)) {
        return result;
    }
    throw new Error(`Invalid config provided for ${network}`);
}
class CoinPayments {
    constructor(config) {
        this.config = config;
        this.payments = {};
        assertType(CoinPaymentsConfig, config);
        this.network = config.network || NetworkType.Mainnet;
        this.logger = config.logger || console;
        const seedBuffer = config.seed && (config.seed.includes(' ')
            ? mnemonicToSeedSync(config.seed)
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

export { CoinPayments, CoinPaymentsAssetConfigs, CoinPaymentsBaseAssetConfigs, CoinPaymentsConfig, CoinPaymentsPartialAssetConfigs, PAYMENTS_FACTORIES, SUPPORTED_ASSET_SYMBOLS, SupportedCoinPaymentsSymbol, assetConfigCodecs, baseAssetConfigCodecs };
//# sourceMappingURL=index.es.js.map
