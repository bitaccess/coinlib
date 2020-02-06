(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('io-ts'), require('@faast/ts-common'), require('@faast/payments-common'), require('@faast/tron-payments'), require('@faast/ripple-payments'), require('@faast/stellar-payments'), require('@faast/bitcoin-payments'), require('bip32')) :
  typeof define === 'function' && define.amd ? define(['exports', 'io-ts', '@faast/ts-common', '@faast/payments-common', '@faast/tron-payments', '@faast/ripple-payments', '@faast/stellar-payments', '@faast/bitcoin-payments', 'bip32'], factory) :
  (global = global || self, factory(global.faastCoinPayments = {}, global.t, global.tsCommon, global.paymentsCommon, global.tronPayments, global.ripplePayments, global.stellarPayments, global.bitcoinPayments, global.bip32));
}(this, (function (exports, t, tsCommon, paymentsCommon, tronPayments, ripplePayments, stellarPayments, bitcoinPayments, bip32) { 'use strict';

  const baseAssetConfigCodecs = {
      TRX: tronPayments.BaseTronPaymentsConfig,
      XRP: ripplePayments.BaseRipplePaymentsConfig,
      XLM: stellarPayments.BaseStellarPaymentsConfig,
      BTC: bitcoinPayments.BaseBitcoinPaymentsConfig,
  };
  const CoinPaymentsBaseAssetConfigs = t.type(baseAssetConfigCodecs, 'CoinPaymentsBaseAssetConfigs');
  const assetConfigCodecs = {
      TRX: tronPayments.TronPaymentsConfig,
      XRP: ripplePayments.RipplePaymentsConfig,
      XLM: stellarPayments.StellarPaymentsConfig,
      BTC: bitcoinPayments.BitcoinPaymentsConfig,
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

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=index.umd.js.map
