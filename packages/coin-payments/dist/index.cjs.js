'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var t = require('io-ts');
var tsCommon = require('@faast/ts-common');
var paymentsCommon = require('@faast/payments-common');
var tronPayments = require('@faast/tron-payments');
var ripplePayments = require('@faast/ripple-payments');
var stellarPayments = require('@faast/stellar-payments');
var bitcoinPayments = require('@faast/bitcoin-payments');
var ethereumPayments = require('@faast/ethereum-payments');
var bip32 = require('bip32');

const baseAssetConfigCodecs = {
    TRX: tronPayments.BaseTronPaymentsConfig,
    XRP: ripplePayments.BaseRipplePaymentsConfig,
    XLM: stellarPayments.BaseStellarPaymentsConfig,
    BTC: bitcoinPayments.BaseBitcoinPaymentsConfig,
    ETH: ethereumPayments.BaseEthereumPaymentsConfig,
};
const CoinPaymentsBaseAssetConfigs = t.type(baseAssetConfigCodecs, 'CoinPaymentsBaseAssetConfigs');
const assetConfigCodecs = {
    TRX: tronPayments.TronPaymentsConfig,
    XRP: ripplePayments.RipplePaymentsConfig,
    XLM: stellarPayments.StellarPaymentsConfig,
    BTC: bitcoinPayments.BitcoinPaymentsConfig,
    ETH: ethereumPayments.EthereumPaymentsConfig,
};
const CoinPaymentsAssetConfigs = t.type(assetConfigCodecs, 'CoinPaymentsAssetConfigs');
const CoinPaymentsConfig = t.partial({
    ...assetConfigCodecs,
    network: paymentsCommon.NetworkTypeT,
    logger: tsCommon.Logger,
    seed: t.string,
}, 'CoinPaymentsConfig');
const SupportedCoinPaymentsSymbol = t.keyof(assetConfigCodecs, 'SupportedCoinPaymentsSymbol');

function keysOf(o) {
    return Object.keys(o);
}

const PAYMENTS_FACTORIES = {
    TRX: new tronPayments.TronPaymentsFactory(),
    XRP: new ripplePayments.RipplePaymentsFactory(),
    XLM: new stellarPayments.StellarPaymentsFactory(),
    BTC: new bitcoinPayments.BitcoinPaymentsFactory(),
    ETH: new ethereumPayments.EthereumPaymentsFactory(),
};
const SUPPORTED_ASSET_SYMBOLS = keysOf(PAYMENTS_FACTORIES);

class CoinPayments {
    constructor(config) {
        this.config = config;
        this.payments = {};
        tsCommon.assertType(CoinPaymentsConfig, config);
        this.network = config.network || paymentsCommon.NetworkType.Mainnet;
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
            assetConfig = { ...assetConfig };
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

Object.keys(paymentsCommon).forEach(function (k) {
  if (k !== 'default') Object.defineProperty(exports, k, {
    enumerable: true,
    get: function () {
      return paymentsCommon[k];
    }
  });
});
exports.Tron = tronPayments;
exports.Ripple = ripplePayments;
exports.Stellar = stellarPayments;
exports.Bitcoin = bitcoinPayments;
exports.CoinPayments = CoinPayments;
exports.CoinPaymentsAssetConfigs = CoinPaymentsAssetConfigs;
exports.CoinPaymentsBaseAssetConfigs = CoinPaymentsBaseAssetConfigs;
exports.CoinPaymentsConfig = CoinPaymentsConfig;
exports.PAYMENTS_FACTORIES = PAYMENTS_FACTORIES;
exports.SUPPORTED_ASSET_SYMBOLS = SUPPORTED_ASSET_SYMBOLS;
exports.SupportedCoinPaymentsSymbol = SupportedCoinPaymentsSymbol;
//# sourceMappingURL=index.cjs.js.map
