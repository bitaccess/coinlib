(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('io-ts'), require('bignumber.js'), require('@faast/ts-common')) :
  typeof define === 'function' && define.amd ? define(['exports', 'io-ts', 'bignumber.js', '@faast/ts-common'], factory) :
  (factory((global.faastPaymentsCommon = {}),global.t,global.BigNumber,global.tsCommon));
}(this, (function (exports,t,BigNumber,tsCommon) { 'use strict';

  BigNumber = BigNumber && BigNumber.hasOwnProperty('default') ? BigNumber['default'] : BigNumber;

  (function (NetworkType) {
      NetworkType["Mainnet"] = "mainnet";
      NetworkType["Testnet"] = "testnet";
  })(exports.NetworkType || (exports.NetworkType = {}));
  const NetworkTypeT = tsCommon.enumCodec(exports.NetworkType, 'NetworkType');
  const BaseConfig = t.partial({
      network: NetworkTypeT,
      logger: tsCommon.Logger,
  }, 'BaseConfig');
  const AddressOrIndex = t.union([t.string, t.number], 'AddressOrIndex');
  (function (FeeLevel) {
      FeeLevel["Custom"] = "custom";
      FeeLevel["Low"] = "low";
      FeeLevel["Medium"] = "medium";
      FeeLevel["High"] = "high";
  })(exports.FeeLevel || (exports.FeeLevel = {}));
  const FeeLevelT = tsCommon.enumCodec(exports.FeeLevel, 'FeeLevel');
  (function (FeeRateType) {
      FeeRateType["Main"] = "main";
      FeeRateType["Base"] = "base";
      FeeRateType["BasePerWeight"] = "base/weight";
  })(exports.FeeRateType || (exports.FeeRateType = {}));
  const FeeRateTypeT = tsCommon.enumCodec(exports.FeeRateType, 'FeeRateType');
  const FeeOptionCustom = tsCommon.requiredOptionalCodec({
      feeRate: t.string,
      feeRateType: FeeRateTypeT,
  }, {
      feeLevel: t.literal(exports.FeeLevel.Custom),
  }, 'FeeOptionCustom');
  const FeeOptionLevel = t.partial({
      feeLevel: t.union([t.literal(exports.FeeLevel.High), t.literal(exports.FeeLevel.Medium), t.literal(exports.FeeLevel.Low)]),
  }, 'FeeOptionLevel');
  const FeeOption = t.union([FeeOptionCustom, FeeOptionLevel], 'FeeOption');
  const CreateTransactionOptions = tsCommon.extendCodec(FeeOption, {}, {
      sequenceNumber: t.number,
      payportBalance: tsCommon.Numeric,
  }, 'CreateTransactionOptions');
  const ResolvedFeeOption = t.type({
      targetFeeLevel: FeeLevelT,
      targetFeeRate: t.string,
      targetFeeRateType: FeeRateTypeT,
      feeBase: t.string,
      feeMain: t.string,
  });
  const BalanceResult = t.type({
      confirmedBalance: t.string,
      unconfirmedBalance: t.string,
      sweepable: t.boolean,
  }, 'BalanceResult');
  (function (TransactionStatus) {
      TransactionStatus["Unsigned"] = "unsigned";
      TransactionStatus["Signed"] = "signed";
      TransactionStatus["Pending"] = "pending";
      TransactionStatus["Confirmed"] = "confirmed";
      TransactionStatus["Failed"] = "failed";
  })(exports.TransactionStatus || (exports.TransactionStatus = {}));
  const TransactionStatusT = tsCommon.enumCodec(exports.TransactionStatus, 'TransactionStatus');
  const TransactionCommon = tsCommon.requiredOptionalCodec({
      status: TransactionStatusT,
      id: tsCommon.nullable(t.string),
      fromAddress: tsCommon.nullable(t.string),
      toAddress: tsCommon.nullable(t.string),
      fromIndex: tsCommon.nullable(t.number),
      toIndex: tsCommon.nullable(t.number),
      amount: tsCommon.nullable(t.string),
      fee: tsCommon.nullable(t.string),
  }, {
      fromExtraId: tsCommon.nullable(t.string),
      toExtraId: tsCommon.nullable(t.string),
      sequenceNumber: tsCommon.nullable(t.number),
  }, 'TransactionCommon');
  const UnsignedCommon = tsCommon.extendCodec(TransactionCommon, {
      fromAddress: t.string,
      toAddress: t.string,
      fromIndex: t.number,
      targetFeeLevel: FeeLevelT,
      targetFeeRate: tsCommon.nullable(t.string),
      targetFeeRateType: tsCommon.nullable(FeeRateTypeT),
  }, 'UnsignedCommon');
  const BaseUnsignedTransaction = tsCommon.extendCodec(UnsignedCommon, {
      status: t.literal(exports.TransactionStatus.Unsigned),
      data: t.object,
  }, 'BaseUnsignedTransaction');
  const BaseSignedTransaction = tsCommon.extendCodec(UnsignedCommon, {
      status: t.literal(exports.TransactionStatus.Signed),
      id: t.string,
      amount: t.string,
      fee: t.string,
      data: t.object,
  }, 'BaseSignedTransaction');
  const BaseTransactionInfo = tsCommon.extendCodec(TransactionCommon, {
      id: t.string,
      amount: t.string,
      fee: t.string,
      isExecuted: t.boolean,
      isConfirmed: t.boolean,
      confirmations: t.number,
      confirmationId: tsCommon.nullable(t.string),
      confirmationTimestamp: tsCommon.nullable(tsCommon.DateT),
      data: t.object,
  }, 'BaseTransactionInfo');
  const BaseBroadcastResult = t.type({
      id: t.string,
  }, 'BaseBroadcastResult');
  const Payport = tsCommon.requiredOptionalCodec({
      address: t.string,
  }, {
      extraId: tsCommon.nullable(t.string),
  }, 'Payport');
  const BalanceActivityType = t.union([t.literal('in'), t.literal('out')], 'BalanceActivityType');
  const BalanceActivity = t.type({
      type: BalanceActivityType,
      networkType: NetworkTypeT,
      networkSymbol: t.string,
      assetSymbol: t.string,
      address: t.string,
      extraId: tsCommon.nullable(t.string),
      amount: t.string,
      externalId: t.string,
      activitySequence: t.string,
      confirmationId: t.string,
      confirmationNumber: t.number,
      timestamp: tsCommon.DateT,
  }, 'BalanceActivity');
  const BalanceMonitorConfig = BaseConfig;
  const GetBalanceActivityOptions = t.partial({
      from: t.union([t.number, BalanceActivity]),
      to: t.union([t.number, BalanceActivity]),
  }, 'GetBalanceActivityOptions');
  const BalanceActivityCallback = tsCommon.functionT('BalanceActivityCallback');
  const ResolveablePayport = t.union([Payport, t.string, t.number], 'ResolveablePayport');
  const RetrieveBalanceActivitiesResult = t.type({
      from: t.number,
      to: t.number,
  }, 'RetrieveBalanceActivitiesResult');

  function createUnitConverters(decimals) {
      const basePerMain = new BigNumber(10).pow(decimals);
      function toMainDenominationBigNumber(baseNumeric) {
          const baseUnits = new BigNumber(baseNumeric);
          if (baseUnits.isNaN()) {
              throw new Error('Cannot convert to main denomination - not a number');
          }
          if (!baseUnits.isFinite()) {
              throw new Error('Cannot convert to main denomination - not finite');
          }
          return baseUnits.div(basePerMain);
      }
      function toMainDenominationString(baseNumeric) {
          return toMainDenominationBigNumber(baseNumeric).toString();
      }
      function toMainDenominationNumber(baseNumeric) {
          return toMainDenominationBigNumber(baseNumeric).toNumber();
      }
      function toBaseDenominationBigNumber(mainNumeric) {
          const mainUnits = new BigNumber(mainNumeric);
          if (mainUnits.isNaN()) {
              throw new Error('Cannot convert to base denomination - not a number');
          }
          if (!mainUnits.isFinite()) {
              throw new Error('Cannot convert to base denomination - not finite');
          }
          return mainUnits.times(basePerMain);
      }
      function toBaseDenominationString(mainNumeric) {
          return toBaseDenominationBigNumber(mainNumeric).toString();
      }
      function toBaseDenominationNumber(mainNumeric) {
          return toBaseDenominationBigNumber(mainNumeric).toNumber();
      }
      return {
          toMainDenominationBigNumber,
          toMainDenominationNumber,
          toMainDenominationString,
          toBaseDenominationBigNumber,
          toBaseDenominationNumber,
          toBaseDenominationString,
      };
  }

  class BalanceMonitor {
      constructor(config) {
          this.networkType = config.network || exports.NetworkType.Mainnet;
          this.logger = new tsCommon.DelegateLogger(config.logger, BalanceMonitor.name);
      }
  }

  exports.NetworkTypeT = NetworkTypeT;
  exports.BaseConfig = BaseConfig;
  exports.AddressOrIndex = AddressOrIndex;
  exports.FeeLevelT = FeeLevelT;
  exports.FeeRateTypeT = FeeRateTypeT;
  exports.FeeOptionCustom = FeeOptionCustom;
  exports.FeeOptionLevel = FeeOptionLevel;
  exports.FeeOption = FeeOption;
  exports.CreateTransactionOptions = CreateTransactionOptions;
  exports.ResolvedFeeOption = ResolvedFeeOption;
  exports.BalanceResult = BalanceResult;
  exports.TransactionStatusT = TransactionStatusT;
  exports.TransactionCommon = TransactionCommon;
  exports.BaseUnsignedTransaction = BaseUnsignedTransaction;
  exports.BaseSignedTransaction = BaseSignedTransaction;
  exports.BaseTransactionInfo = BaseTransactionInfo;
  exports.BaseBroadcastResult = BaseBroadcastResult;
  exports.Payport = Payport;
  exports.BalanceActivityType = BalanceActivityType;
  exports.BalanceActivity = BalanceActivity;
  exports.BalanceMonitorConfig = BalanceMonitorConfig;
  exports.GetBalanceActivityOptions = GetBalanceActivityOptions;
  exports.BalanceActivityCallback = BalanceActivityCallback;
  exports.ResolveablePayport = ResolveablePayport;
  exports.RetrieveBalanceActivitiesResult = RetrieveBalanceActivitiesResult;
  exports.createUnitConverters = createUnitConverters;
  exports.BalanceMonitor = BalanceMonitor;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=index.umd.js.map
