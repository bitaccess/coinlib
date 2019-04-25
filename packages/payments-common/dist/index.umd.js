(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('io-ts'), require('@faast/ts-common')) :
  typeof define === 'function' && define.amd ? define(['exports', 'io-ts', '@faast/ts-common'], factory) :
  (factory((global.payments_common = {}),global.t,global.tsCommon));
}(this, (function (exports,t,tsCommon) { 'use strict';

  var AddressOrIndex = t.union([t.string, t.number], 'AddressOrIndex');
  (function (FeeLevel) {
      FeeLevel["Custom"] = "custom";
      FeeLevel["Low"] = "low";
      FeeLevel["Medium"] = "medium";
      FeeLevel["High"] = "high";
  })(exports.FeeLevel || (exports.FeeLevel = {}));
  var FeeLevelT = tsCommon.enumCodec(exports.FeeLevel, 'FeeLevel');
  (function (FeeRateType) {
      FeeRateType["Main"] = "main";
      FeeRateType["Base"] = "base";
      FeeRateType["BasePerWeight"] = "base/weight";
  })(exports.FeeRateType || (exports.FeeRateType = {}));
  var FeeRateTypeT = tsCommon.enumCodec(exports.FeeRateType, 'FeeRateType');
  var FeeOption = t.union([
      tsCommon.requiredOptionalCodec({
          feeRate: t.string,
          feeRateType: FeeRateTypeT,
      }, {
          feeLevel: t.literal(exports.FeeLevel.Custom),
      }, 'FeeOptionCustom'),
      t.type({
          feeLevel: t.union([
              t.literal(exports.FeeLevel.High),
              t.literal(exports.FeeLevel.Medium),
              t.literal(exports.FeeLevel.Low),
          ])
      }, 'FeeOptionLevel'),
  ], 'FeeOption');
  var CreateTransactionOptions = FeeOption;
  var BalanceResult = t.type({
      balance: t.string,
      unconfirmedBalance: t.string,
  }, 'BalanceResult');
  (function (TransactionStatus) {
      TransactionStatus["Unsigned"] = "unsigned";
      TransactionStatus["Signed"] = "signed";
      TransactionStatus["Pending"] = "pending";
      TransactionStatus["Confirmed"] = "confirmed";
      TransactionStatus["Failed"] = "failed";
  })(exports.TransactionStatus || (exports.TransactionStatus = {}));
  var TransactionStatusT = tsCommon.enumCodec(exports.TransactionStatus, 'TransactionStatus');
  var TransactionCommon = t.type({
      id: tsCommon.nullable(t.string),
      fromAddress: tsCommon.nullable(t.string),
      toAddress: tsCommon.nullable(t.string),
      toExtraId: tsCommon.nullable(t.string),
      fromIndex: tsCommon.nullable(t.number),
      toIndex: tsCommon.nullable(t.number),
      amount: tsCommon.nullable(t.string),
      fee: tsCommon.nullable(t.string),
      status: TransactionStatusT,
  }, 'TransactionCommon');
  var UnsignedCommon = tsCommon.extendCodec(TransactionCommon, {
      fromAddress: t.string,
      toAddress: t.string,
      fromIndex: t.number,
      targetFeeLevel: FeeLevelT,
      targetFeeRate: tsCommon.nullable(t.string),
      targetFeeRateType: tsCommon.nullable(FeeRateTypeT),
  }, 'UnsignedCommon');
  var BaseUnsignedTransaction = tsCommon.extendCodec(UnsignedCommon, {
      status: t.literal('unsigned'),
      data: t.UnknownRecord,
  }, 'BaseUnsignedTransaction');
  var BaseSignedTransaction = tsCommon.extendCodec(UnsignedCommon, {
      status: t.literal('signed'),
      id: t.string,
      amount: t.string,
      fee: t.string,
      data: t.UnknownRecord,
  }, 'BaseSignedTransaction');
  var BaseTransactionInfo = tsCommon.extendCodec(TransactionCommon, {
      id: t.string,
      amount: t.string,
      fee: t.string,
      isExecuted: t.boolean,
      isConfirmed: t.boolean,
      confirmations: t.number,
      block: tsCommon.nullable(t.number),
      date: tsCommon.nullable(tsCommon.DateT),
      data: t.UnknownRecord,
  }, 'BaseTransactionInfo');
  var BaseBroadcastResult = t.type({
      id: t.string,
  }, 'BaseBroadcastResult');

  exports.AddressOrIndex = AddressOrIndex;
  exports.FeeLevelT = FeeLevelT;
  exports.FeeRateTypeT = FeeRateTypeT;
  exports.FeeOption = FeeOption;
  exports.CreateTransactionOptions = CreateTransactionOptions;
  exports.BalanceResult = BalanceResult;
  exports.TransactionStatusT = TransactionStatusT;
  exports.TransactionCommon = TransactionCommon;
  exports.BaseUnsignedTransaction = BaseUnsignedTransaction;
  exports.BaseSignedTransaction = BaseSignedTransaction;
  exports.BaseTransactionInfo = BaseTransactionInfo;
  exports.BaseBroadcastResult = BaseBroadcastResult;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=index.umd.js.map
