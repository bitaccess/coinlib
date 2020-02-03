(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('bitcoinjs-lib'), require('@faast/payments-common'), require('request-promise-native'), require('bs58'), require('io-ts'), require('@faast/ts-common'), require('blockbook-client'), require('bignumber.js'), require('lodash'), require('promise-retry'), require('bip32')) :
  typeof define === 'function' && define.amd ? define(['exports', 'bitcoinjs-lib', '@faast/payments-common', 'request-promise-native', 'bs58', 'io-ts', '@faast/ts-common', 'blockbook-client', 'bignumber.js', 'lodash', 'promise-retry', 'bip32'], factory) :
  (global = global || self, factory(global.faastBitcoinPayments = {}, global.bitcoin, global.paymentsCommon, global.request, global.bs58, global.t, global.tsCommon, global.blockbookClient, global.BigNumber, global.lodash, global.promiseRetry, global.bip32));
}(this, (function (exports, bitcoin, paymentsCommon, request, bs58, t, tsCommon, blockbookClient, BigNumber, lodash, promiseRetry, bip32) { 'use strict';

  request = request && request.hasOwnProperty('default') ? request['default'] : request;
  bs58 = bs58 && bs58.hasOwnProperty('default') ? bs58['default'] : bs58;
  BigNumber = BigNumber && BigNumber.hasOwnProperty('default') ? BigNumber['default'] : BigNumber;
  promiseRetry = promiseRetry && promiseRetry.hasOwnProperty('default') ? promiseRetry['default'] : promiseRetry;

  function resolveServer(server, network) {
      if (tsCommon.isString(server)) {
          return {
              api: new blockbookClient.BlockbookBitcoin({
                  nodes: [server],
              }),
              server,
          };
      }
      else if (server instanceof blockbookClient.BlockbookBitcoin) {
          return {
              api: server,
              server: server.nodes[0] || '',
          };
      }
      else {
          return {
              api: new blockbookClient.BlockbookBitcoin({
                  nodes: [''],
              }),
              server: null,
          };
      }
  }
  const RETRYABLE_ERRORS = ['timeout', 'disconnected'];
  const MAX_RETRIES = 3;
  function retryIfDisconnected(fn, api, logger) {
      return promiseRetry((retry, attempt) => {
          return fn().catch(async (e) => {
              if (tsCommon.isMatchingError(e, RETRYABLE_ERRORS)) {
                  logger.log(`Retryable error during blockbook server call, retrying ${MAX_RETRIES - attempt} more times`, e.toString());
                  retry(e);
              }
              throw e;
          });
      }, {
          retries: MAX_RETRIES,
      });
  }
  function estimateTxSize(inputsCount, outputsCount, handleSegwit) {
      let maxNoWitness;
      let maxSize;
      let maxWitness;
      let minNoWitness;
      let minSize;
      let minWitness;
      let varintLength;
      if (inputsCount < 0xfd) {
          varintLength = 1;
      }
      else if (inputsCount < 0xffff) {
          varintLength = 3;
      }
      else {
          varintLength = 5;
      }
      if (handleSegwit) {
          minNoWitness =
              varintLength + 4 + 2 + 59 * inputsCount + 1 + 31 * outputsCount + 4;
          maxNoWitness =
              varintLength + 4 + 2 + 59 * inputsCount + 1 + 33 * outputsCount + 4;
          minWitness =
              varintLength +
                  4 +
                  2 +
                  59 * inputsCount +
                  1 +
                  31 * outputsCount +
                  4 +
                  106 * inputsCount;
          maxWitness =
              varintLength +
                  4 +
                  2 +
                  59 * inputsCount +
                  1 +
                  33 * outputsCount +
                  4 +
                  108 * inputsCount;
          minSize = (minNoWitness * 3 + minWitness) / 4;
          maxSize = (maxNoWitness * 3 + maxWitness) / 4;
      }
      else {
          minSize = varintLength + 4 + 146 * inputsCount + 1 + 31 * outputsCount + 4;
          maxSize = varintLength + 4 + 148 * inputsCount + 1 + 33 * outputsCount + 4;
      }
      return {
          min: minSize,
          max: maxSize
      };
  }
  function estimateTxFee(satPerByte, inputsCount, outputsCount, handleSegwit) {
      const { min, max } = estimateTxSize(inputsCount, outputsCount, handleSegwit);
      const mean = Math.ceil((min + max) / 2);
      return mean * satPerByte;
  }
  function sortUtxos(utxoList) {
      const matureList = [];
      const immatureList = [];
      utxoList.forEach((utxo) => {
          if (utxo.confirmations && utxo.confirmations >= 6) {
              matureList.push(utxo);
          }
          else {
              immatureList.push(utxo);
          }
      });
      matureList.sort((a, b) => tsCommon.toBigNumber(a.value).minus(b.value).toNumber());
      immatureList.sort((a, b) => (b.confirmations || 0) - (a.confirmations || 0));
      return matureList.concat(immatureList);
  }

  class BlockbookServerAPI extends blockbookClient.BlockbookBitcoin {
  }
  const BlockbookConfigServer = t.union([t.string, tsCommon.instanceofCodec(BlockbookServerAPI), t.null], 'BlockbookConfigServer');
  const BlockbookConnectedConfig = tsCommon.requiredOptionalCodec({
      network: paymentsCommon.NetworkTypeT,
      server: BlockbookConfigServer,
  }, {
      logger: tsCommon.nullable(tsCommon.Logger),
  }, 'BlockbookConnectedConfig');
  const BitcoinishTxOutput = t.type({
      address: t.string,
      value: t.string,
  }, 'BitcoinishTxOutput');
  const BitcoinishPaymentTx = t.type({
      inputs: t.array(paymentsCommon.UtxoInfo),
      outputs: t.array(BitcoinishTxOutput),
      fee: t.string,
      change: t.string,
      changeAddress: tsCommon.nullable(t.string),
  }, 'BitcoinishPaymentTx');
  const BitcoinishUnsignedTransaction = tsCommon.extendCodec(paymentsCommon.BaseUnsignedTransaction, {
      amount: t.string,
      fee: t.string,
  }, 'BitcoinishUnsignedTransaction');
  const BitcoinishSignedTransaction = tsCommon.extendCodec(paymentsCommon.BaseSignedTransaction, {
      data: t.type({
          hex: t.string,
      }),
  }, {}, 'BitcoinishSignedTransaction');
  const BitcoinishTransactionInfo = tsCommon.extendCodec(paymentsCommon.BaseTransactionInfo, {}, {}, 'BitcoinishTransactionInfo');
  const BitcoinishBroadcastResult = tsCommon.extendCodec(paymentsCommon.BaseBroadcastResult, {}, {}, 'BitcoinishBroadcastResult');
  const BitcoinishBlock = blockbookClient.BlockInfoBitcoin;

  class BlockbookConnected {
      constructor(config) {
          tsCommon.assertType(BlockbookConnectedConfig, config);
          this.networkType = config.network;
          this.logger = new tsCommon.DelegateLogger(config.logger);
          const { api, server } = resolveServer(config.server, this.networkType);
          this.api = api;
          this.server = server;
      }
      getApi() {
          if (this.api === null) {
              throw new Error('Cannot access Bitcoin network when configured with null server');
          }
          return this.api;
      }
      async init() { }
      async destroy() { }
      async _retryDced(fn) {
          return retryIfDisconnected(fn, this.getApi(), this.logger);
      }
  }

  class BitcoinishPaymentsUtils extends BlockbookConnected {
      constructor(config) {
          super(config);
          this.decimals = config.decimals;
          this.bitcoinjsNetwork = config.bitcoinjsNetwork;
          const unitConverters = paymentsCommon.createUnitConverters(this.decimals);
          this.toMainDenominationString = unitConverters.toMainDenominationString;
          this.toMainDenominationNumber = unitConverters.toMainDenominationNumber;
          this.toMainDenominationBigNumber = unitConverters.toMainDenominationBigNumber;
          this.toBaseDenominationString = unitConverters.toBaseDenominationString;
          this.toBaseDenominationNumber = unitConverters.toBaseDenominationNumber;
          this.toBaseDenominationBigNumber = unitConverters.toBaseDenominationBigNumber;
      }
      async isValidExtraId(extraId) {
          return false;
      }
      async _getPayportValidationMessage(payport) {
          const { address, extraId } = payport;
          if (!await this.isValidAddress(address)) {
              return 'Invalid payport address';
          }
          if (!tsCommon.isNil(extraId)) {
              return 'Invalid payport extraId';
          }
      }
      async getPayportValidationMessage(payport) {
          try {
              payport = tsCommon.assertType(paymentsCommon.Payport, payport, 'payport');
          }
          catch (e) {
              return e.message;
          }
          return this._getPayportValidationMessage(payport);
      }
      async validatePayport(payport) {
          payport = tsCommon.assertType(paymentsCommon.Payport, payport, 'payport');
          const message = await this._getPayportValidationMessage(payport);
          if (message) {
              throw new Error(message);
          }
      }
      async isValidPayport(payport) {
          return paymentsCommon.Payport.is(payport) && !(await this._getPayportValidationMessage(payport));
      }
      toMainDenomination(amount) {
          return this.toMainDenominationString(amount);
      }
      toBaseDenomination(amount) {
          return this.toBaseDenominationString(amount);
      }
      async getBlock(id) {
          if (tsCommon.isUndefined(id)) {
              id = (await this.getApi().getStatus()).backend.bestBlockHash;
          }
          return this.getApi().getBlock(id);
      }
  }

  class BitcoinishPayments extends BitcoinishPaymentsUtils {
      constructor(config) {
          super(config);
          this.coinSymbol = config.coinSymbol;
          this.coinName = config.coinName;
          this.decimals = config.decimals;
          this.bitcoinjsNetwork = config.bitcoinjsNetwork;
          this.minTxFee = config.minTxFee;
          this.dustThreshold = config.dustThreshold;
          this.networkMinRelayFee = config.networkMinRelayFee;
          this.isSegwit = config.isSegwit;
          this.defaultFeeLevel = config.defaultFeeLevel;
      }
      async init() { }
      async destroy() { }
      requiresBalanceMonitor() {
          return false;
      }
      isSweepableBalance(balance) {
          return this.toBaseDenominationNumber(balance) > this.networkMinRelayFee;
      }
      async getPayport(index) {
          return { address: this.getAddress(index) };
      }
      async resolvePayport(payport) {
          if (typeof payport === 'number') {
              return this.getPayport(payport);
          }
          else if (typeof payport === 'string') {
              if (!await this.isValidAddress(payport)) {
                  throw new Error(`Invalid BTC address: ${payport}`);
              }
              return { address: payport };
          }
          else if (paymentsCommon.Payport.is(payport)) {
              if (!await this.isValidAddress(payport.address)) {
                  throw new Error(`Invalid BTC payport.address: ${payport.address}`);
              }
              return payport;
          }
          else {
              throw new Error('Invalid payport');
          }
      }
      _feeRateToSatoshis({ feeRate, feeRateType }, inputCount, outputCount) {
          if (feeRateType === paymentsCommon.FeeRateType.BasePerWeight) {
              return estimateTxFee(Number.parseFloat(feeRate), inputCount, outputCount, this.isSegwit);
          }
          else if (feeRateType === paymentsCommon.FeeRateType.Main) {
              return this.toBaseDenominationNumber(feeRate);
          }
          return Number.parseFloat(feeRate);
      }
      _calculatTxFeeSatoshis(targetRate, inputCount, outputCount) {
          let feeSat = this._feeRateToSatoshis(targetRate, inputCount, outputCount);
          if (this.minTxFee) {
              const minTxFeeSat = this._feeRateToSatoshis(this.minTxFee, inputCount, outputCount);
              if (feeSat < minTxFeeSat) {
                  feeSat = minTxFeeSat;
              }
          }
          if (feeSat < this.networkMinRelayFee) {
              feeSat = this.networkMinRelayFee;
          }
          return Math.ceil(feeSat);
      }
      async resolveFeeOption(feeOption) {
          let targetLevel;
          let target;
          let feeBase = '';
          let feeMain = '';
          if (tsCommon.isType(paymentsCommon.FeeOptionCustom, feeOption)) {
              targetLevel = paymentsCommon.FeeLevel.Custom;
              target = feeOption;
          }
          else {
              targetLevel = feeOption.feeLevel || this.defaultFeeLevel;
              target = await this.getFeeRateRecommendation(targetLevel);
          }
          if (target.feeRateType === paymentsCommon.FeeRateType.Base) {
              feeBase = target.feeRate;
              feeMain = this.toMainDenominationString(feeBase);
          }
          else if (target.feeRateType === paymentsCommon.FeeRateType.Main) {
              feeMain = target.feeRate;
              feeBase = this.toBaseDenominationString(feeMain);
          }
          return {
              targetFeeLevel: targetLevel,
              targetFeeRate: target.feeRate,
              targetFeeRateType: target.feeRateType,
              feeBase,
              feeMain,
          };
      }
      async getBalance(payport) {
          const { address } = await this.resolvePayport(payport);
          const result = await this._retryDced(() => this.getApi().getAddressDetails(address, { details: 'basic' }));
          const confirmedBalance = this.toMainDenominationString(result.balance);
          const unconfirmedBalance = this.toMainDenominationString(result.unconfirmedBalance);
          this.logger.debug('getBalance', address, confirmedBalance, unconfirmedBalance);
          return {
              confirmedBalance,
              unconfirmedBalance,
              sweepable: this.isSweepableBalance(confirmedBalance)
          };
      }
      usesUtxos() {
          return true;
      }
      async getUtxos(payport) {
          const { address } = await this.resolvePayport(payport);
          let utxosRaw = await this.getApi().getUtxosForAddress(address);
          const utxos = utxosRaw.map((data) => {
              const { value, height, lockTime } = data;
              return {
                  ...data,
                  satoshis: value,
                  value: this.toMainDenominationString(value),
                  height: tsCommon.isUndefined(height) ? undefined : String(height),
                  lockTime: tsCommon.isUndefined(lockTime) ? undefined : String(lockTime),
              };
          });
          return utxos;
      }
      _sumUtxoValue(utxos) {
          return utxos.reduce((total, { value }) => tsCommon.toBigNumber(value).plus(total), new BigNumber(0));
      }
      usesSequenceNumber() {
          return false;
      }
      async getNextSequenceNumber() {
          return null;
      }
      async resolveFromTo(from, to) {
          const fromPayport = await this.getPayport(from);
          const toPayport = await this.resolvePayport(to);
          return {
              fromAddress: fromPayport.address,
              fromIndex: from,
              fromExtraId: fromPayport.extraId,
              fromPayport,
              toAddress: toPayport.address,
              toIndex: typeof to === 'number' ? to : null,
              toExtraId: toPayport.extraId,
              toPayport,
          };
      }
      async buildPaymentTx(utxos, desiredOutputs, changeAddress, desiredFeeRate, useAllUtxos = false) {
          let outputTotal = 0;
          const outputs = desiredOutputs.map(({ address, value }) => ({
              address,
              satoshis: this.toBaseDenominationNumber(value),
          }));
          for (let i = 0; i < outputs.length; i++) {
              const { address, satoshis } = outputs[i];
              if (!await this.isValidAddress(address)) {
                  throw new Error(`Invalid ${this.coinSymbol} address ${address} provided for output ${i}`);
              }
              if (satoshis <= 0) {
                  throw new Error(`Invalid ${this.coinSymbol} amount ${satoshis} provided for output ${i}`);
              }
              outputTotal += satoshis;
          }
          const outputCount = outputs.length + 1;
          let inputUtxos = [];
          let inputTotal = 0;
          let feeSat = 0;
          let amountWithFee = outputTotal + feeSat;
          if (useAllUtxos) {
              inputUtxos = utxos;
              inputTotal = this.toBaseDenominationNumber(this._sumUtxoValue(utxos));
              feeSat = this._calculatTxFeeSatoshis(desiredFeeRate, inputUtxos.length, outputCount);
              amountWithFee = outputTotal + feeSat;
              this.logger.debug('buildPaymentTx', { inputTotal, feeSat, amountWithFee });
          }
          else {
              const sortedUtxos = sortUtxos(utxos);
              for (const utxo of sortedUtxos) {
                  inputUtxos.push(utxo);
                  inputTotal = inputTotal + this.toBaseDenominationNumber(utxo.value);
                  feeSat = this._calculatTxFeeSatoshis(desiredFeeRate, inputUtxos.length, outputCount);
                  amountWithFee = outputTotal + feeSat;
                  if (inputTotal >= amountWithFee) {
                      break;
                  }
              }
          }
          if (amountWithFee > inputTotal) {
              const amountWithSymbol = `${this.toMainDenominationString(outputTotal)} ${this.coinSymbol}`;
              if (outputTotal === inputTotal) {
                  this.logger.debug(`Attempting to send entire ${amountWithSymbol} balance. ` +
                      `Subtracting fee of ${feeSat} sat from first output.`);
                  amountWithFee = outputTotal;
                  outputs[0].satoshis -= feeSat;
                  outputTotal -= feeSat;
                  if (outputs[0].satoshis <= this.dustThreshold) {
                      throw new Error(`First ${this.coinSymbol} output minus fee is below dust threshold`);
                  }
              }
              else {
                  const { feeRate, feeRateType } = desiredFeeRate;
                  const feeText = `${feeRate} ${feeRateType}${feeRateType === paymentsCommon.FeeRateType.BasePerWeight ? ` (${this.toMainDenominationString(feeSat)})` : ''}`;
                  throw new Error(`You do not have enough UTXOs (${this.toMainDenominationString(inputTotal)}) to send ${amountWithSymbol} with ${feeText} fee`);
              }
          }
          let changeSat = inputTotal - amountWithFee;
          let change = this.toMainDenominationString(changeSat);
          if (changeSat > this.dustThreshold) {
              outputs.push({ address: changeAddress, satoshis: changeSat });
          }
          else if (changeSat > 0) {
              this.logger.log(`${this.coinSymbol} change of ${changeSat} sat is below dustThreshold of ${this.dustThreshold}, adding to fee`);
              feeSat += changeSat;
              changeSat = 0;
              change = '0';
          }
          return {
              inputs: inputUtxos,
              outputs: outputs.map(({ address, satoshis }) => ({ address, value: this.toMainDenominationString(satoshis) })),
              fee: this.toMainDenominationString(feeSat),
              change,
              changeAddress,
          };
      }
      async createTransaction(from, to, amountNumeric, options = {}) {
          this.logger.debug('createTransaction', from, to, amountNumeric);
          const desiredAmount = tsCommon.toBigNumber(amountNumeric);
          if (desiredAmount.isNaN() || desiredAmount.lte(0)) {
              throw new Error(`Invalid ${this.coinSymbol} amount provided to createTransaction: ${desiredAmount}`);
          }
          const { fromIndex, fromAddress, fromExtraId, toIndex, toAddress, toExtraId, } = await this.resolveFromTo(from, to);
          const utxos = tsCommon.isUndefined(options.utxos)
              ? await this.getUtxos(from)
              : options.utxos;
          this.logger.debug('createTransaction utxos', utxos);
          const { targetFeeLevel, targetFeeRate, targetFeeRateType } = await this.resolveFeeOption(options);
          this.logger.debug(`createTransaction resolvedFeeOption ${targetFeeLevel} ${targetFeeRate} ${targetFeeRateType}`);
          const paymentTx = await this.buildPaymentTx(utxos, [{ address: toAddress, value: desiredAmount.toString() }], fromAddress, { feeRate: targetFeeRate, feeRateType: targetFeeRateType }, options.useAllUtxos);
          this.logger.debug('createTransaction data', paymentTx);
          const feeMain = paymentTx.fee;
          const actualAmount = paymentTx.outputs[0].value;
          return {
              status: paymentsCommon.TransactionStatus.Unsigned,
              id: null,
              fromIndex,
              fromAddress,
              fromExtraId,
              toIndex,
              toAddress,
              toExtraId,
              amount: actualAmount,
              targetFeeLevel,
              targetFeeRate,
              targetFeeRateType,
              fee: feeMain,
              sequenceNumber: null,
              data: paymentTx,
          };
      }
      async createSweepTransaction(from, to, options = {}) {
          this.logger.debug('createSweepTransaction', from, to, options);
          const utxos = tsCommon.isUndefined(options.utxos)
              ? await this.getUtxos(from)
              : options.utxos;
          if (utxos.length === 0) {
              throw new Error('No utxos to sweep');
          }
          const amount = this._sumUtxoValue(utxos);
          if (!this.isSweepableBalance(amount)) {
              throw new Error(`Balance ${amount} too low to sweep`);
          }
          return this.createTransaction(from, to, amount, {
              ...options,
              utxos,
              useAllUtxos: true,
          });
      }
      async broadcastTransaction(tx) {
          const txId = await this._retryDced(() => this.getApi().sendTx(tx.data.hex));
          if (tx.id !== txId) {
              this.logger.warn(`Broadcasted ${this.coinSymbol} txid ${txId} doesn't match original txid ${tx.id}`);
          }
          return {
              id: txId,
          };
      }
      async getTransactionInfo(txId) {
          const tx = await this._retryDced(() => this.getApi().getTx(txId));
          const fee = this.toMainDenominationString(tx.fees);
          const confirmationId = tx.blockHash || null;
          const confirmationNumber = tx.blockHeight ? String(tx.blockHeight) : undefined;
          const confirmationTimestamp = tx.blockTime ? new Date(tx.blockTime * 1000) : null;
          const isConfirmed = Boolean(confirmationNumber);
          const status = isConfirmed ? paymentsCommon.TransactionStatus.Confirmed : paymentsCommon.TransactionStatus.Pending;
          const amountSat = lodash.get(tx, 'vout.0.value', tx.value);
          const amount = this.toMainDenominationString(amountSat);
          const fromAddress = lodash.get(tx, 'vin.0.addresses.0');
          if (!fromAddress) {
              throw new Error(`Unable to determine fromAddress of ${this.coinSymbol} tx ${txId}`);
          }
          const toAddress = lodash.get(tx, 'vout.0.addresses.0');
          if (!toAddress) {
              throw new Error(`Unable to determine toAddress of ${this.coinSymbol} tx ${txId}`);
          }
          return {
              status,
              id: tx.txid,
              fromIndex: null,
              fromAddress,
              fromExtraId: null,
              toIndex: null,
              toAddress,
              toExtraId: null,
              amount,
              fee,
              sequenceNumber: null,
              confirmationId,
              confirmationNumber,
              confirmationTimestamp,
              isExecuted: isConfirmed,
              isConfirmed,
              confirmations: tx.confirmations,
              data: tx,
          };
      }
  }

  (function (AddressType) {
      AddressType["Legacy"] = "p2pkh";
      AddressType["SegwitP2SH"] = "p2sh-p2wpkh";
      AddressType["SegwitNative"] = "p2wpkh";
  })(exports.AddressType || (exports.AddressType = {}));
  const AddressTypeT = tsCommon.enumCodec(exports.AddressType, 'AddressType');
  const BitcoinPaymentsUtilsConfig = tsCommon.extendCodec(paymentsCommon.BaseConfig, {}, {
      server: BlockbookConfigServer,
  }, 'BitcoinPaymentsUtilsConfig');
  const BaseBitcoinPaymentsConfig = tsCommon.extendCodec(BitcoinPaymentsUtilsConfig, {}, {
      addressType: AddressTypeT,
      minTxFee: paymentsCommon.FeeRate,
      dustThreshold: t.number,
      networkMinRelayFee: t.number,
  }, 'BaseBitcoinPaymentsConfig');
  const HdBitcoinPaymentsConfig = tsCommon.extendCodec(BaseBitcoinPaymentsConfig, {
      hdKey: t.string,
  }, {
      derivationPath: t.string,
  }, 'HdBitcoinPaymentsConfig');
  const BitcoinPaymentsConfig = HdBitcoinPaymentsConfig;
  const BitcoinUnsignedTransactionData = BitcoinishPaymentTx;
  const BitcoinUnsignedTransaction = tsCommon.extendCodec(paymentsCommon.BaseUnsignedTransaction, {
      amount: t.string,
      fee: t.string,
      data: BitcoinUnsignedTransactionData,
  }, 'BitcoinUnsignedTransaction');
  const BitcoinSignedTransaction = tsCommon.extendCodec(paymentsCommon.BaseSignedTransaction, {
      data: t.type({
          hex: t.string,
      }),
  }, {}, 'BitcoinSignedTransaction');
  const BitcoinTransactionInfo = tsCommon.extendCodec(paymentsCommon.BaseTransactionInfo, {}, {}, 'BitcoinTransactionInfo');
  const BitcoinBroadcastResult = tsCommon.extendCodec(paymentsCommon.BaseBroadcastResult, {}, {}, 'BitcoinBroadcastResult');
  const BitcoinBlock = blockbookClient.BlockInfoBitcoin;

  const PACKAGE_NAME = 'bitcoin-payments';
  const DECIMAL_PLACES = 8;
  const COIN_SYMBOL = 'BTC';
  const COIN_NAME = 'Bitcoin';
  const DEFAULT_DUST_THRESHOLD = 546;
  const DEFAULT_NETWORK_MIN_RELAY_FEE = 1000;
  const DEFAULT_MIN_TX_FEE = 5;
  const DEFAULT_ADDRESS_TYPE = exports.AddressType.SegwitNative;
  const DEFAULT_DERIVATION_PATHS = {
      [exports.AddressType.Legacy]: "m/44'/0'/0'",
      [exports.AddressType.SegwitP2SH]: "m/49'/0'/0'",
      [exports.AddressType.SegwitNative]: "m/84'/0'/0'",
  };
  const DEFAULT_NETWORK = paymentsCommon.NetworkType.Mainnet;
  const NETWORK_MAINNET = bitcoin.networks.bitcoin;
  const NETWORK_TESTNET = bitcoin.networks.testnet;
  const DEFAULT_MAINNET_SERVER = process.env.BITCOIN_SERVER_URL || 'https://btc1.trezor.io';
  const DEFAULT_TESTNET_SERVER = process.env.BITCOIN_TESTNET_SERVER_URL || 'https://tbtc1.trezor.io';
  const DEFAULT_FEE_LEVEL = paymentsCommon.FeeLevel.Medium;
  const DEFAULT_SAT_PER_BYTE_LEVELS = {
      [paymentsCommon.FeeLevel.High]: 50,
      [paymentsCommon.FeeLevel.Medium]: 25,
      [paymentsCommon.FeeLevel.Low]: 10,
  };

  const DEFAULT_BITCOINISH_CONFIG = {
      coinSymbol: COIN_SYMBOL,
      coinName: COIN_NAME,
      decimals: DECIMAL_PLACES,
      dustThreshold: DEFAULT_DUST_THRESHOLD,
      networkMinRelayFee: DEFAULT_NETWORK_MIN_RELAY_FEE,
      minTxFee: {
          feeRate: DEFAULT_MIN_TX_FEE.toString(),
          feeRateType: paymentsCommon.FeeRateType.BasePerWeight,
      },
      defaultFeeLevel: DEFAULT_FEE_LEVEL,
  };
  function bip32MagicNumberToPrefix(magicNum) {
      const b = Buffer.alloc(82);
      b.writeUInt32BE(magicNum, 0);
      return bs58.encode(b).slice(0, 4);
  }
  function toBitcoinishConfig(config) {
      const configWithDefaults = {
          ...DEFAULT_BITCOINISH_CONFIG,
          ...config,
          network: config.network || DEFAULT_NETWORK,
          addressType: config.addressType || DEFAULT_ADDRESS_TYPE,
      };
      const { network, server, addressType } = configWithDefaults;
      return {
          ...configWithDefaults,
          bitcoinjsNetwork: network === paymentsCommon.NetworkType.Testnet ? NETWORK_TESTNET : NETWORK_MAINNET,
          isSegwit: addressType === exports.AddressType.SegwitNative || addressType === exports.AddressType.SegwitP2SH,
          server: typeof server !== 'undefined'
              ? server
              : (network === paymentsCommon.NetworkType.Testnet
                  ? DEFAULT_TESTNET_SERVER
                  : DEFAULT_MAINNET_SERVER),
      };
  }
  async function getBlockcypherFeeEstimate(feeLevel, networkType) {
      const body = await request.get(`https://api.blockcypher.com/v1/btc/${networkType === paymentsCommon.NetworkType.Mainnet ? 'main' : 'test3'}`, { json: true });
      const feePerKbField = `${feeLevel}_fee_per_kb`;
      const feePerKb = body[feePerKbField];
      if (!feePerKb) {
          throw new Error(`Blockcypher response is missing expected field ${feePerKbField}`);
      }
      return feePerKb / 1000;
  }

  const { toMainDenominationBigNumber, toMainDenominationString, toMainDenominationNumber, toBaseDenominationBigNumber, toBaseDenominationString, toBaseDenominationNumber, } = paymentsCommon.createUnitConverters(DECIMAL_PLACES);
  function isValidXprv(xprv, network) {
      try {
          return !bip32.fromBase58(xprv, network).isNeutered();
      }
      catch (e) {
          return false;
      }
  }
  function isValidXpub(xpub, network) {
      try {
          return bip32.fromBase58(xpub, network).isNeutered();
      }
      catch (e) {
          return false;
      }
  }
  function validateHdKey(hdKey, network) {
      try {
          bip32.fromBase58(hdKey, network);
      }
      catch (e) {
          return e.toString();
      }
  }
  function isValidAddress(address, network) {
      try {
          bitcoin.address.toOutputScript(address, network);
          return true;
      }
      catch (e) {
          return false;
      }
  }
  function isValidExtraId(extraId) {
      return false;
  }
  function publicKeyToAddress(publicKey, network, addressType) {
      let script;
      if (addressType === exports.AddressType.Legacy) {
          script = bitcoin.payments.p2pkh({ network, pubkey: publicKey });
      }
      else {
          script = bitcoin.payments.p2wpkh({ network, pubkey: publicKey });
          if (addressType === exports.AddressType.SegwitP2SH) {
              script = bitcoin.payments.p2sh({
                  network,
                  redeem: script
              });
          }
      }
      const { address } = script;
      if (!address) {
          throw new Error('bitcoinjs-lib address derivation returned falsy value');
      }
      return address;
  }
  function privateKeyToKeyPair(privateKey, network) {
      return bitcoin.ECPair.fromWIF(privateKey, network);
  }
  function privateKeyToAddress(privateKey, network, addressType) {
      const keyPair = privateKeyToKeyPair(privateKey, network);
      return publicKeyToAddress(keyPair.publicKey, network, addressType);
  }
  function isValidPrivateKey(privateKey, network) {
      try {
          privateKeyToKeyPair(privateKey, network);
          return true;
      }
      catch (e) {
          return false;
      }
  }

  class BaseBitcoinPayments extends BitcoinishPayments {
      constructor(config) {
          super(toBitcoinishConfig(config));
          this.addressType = config.addressType || DEFAULT_ADDRESS_TYPE;
      }
      async isValidAddress(address) {
          return isValidAddress(address, this.bitcoinjsNetwork);
      }
      async getFeeRateRecommendation(feeLevel) {
          let satPerByte;
          try {
              satPerByte = await getBlockcypherFeeEstimate(feeLevel, this.networkType);
          }
          catch (e) {
              satPerByte = DEFAULT_SAT_PER_BYTE_LEVELS[feeLevel];
              this.logger.warn(`Failed to get bitcoin ${this.networkType} fee estimate, using hardcoded default of ${feeLevel} sat/byte -- ${e.message}`);
          }
          return {
              feeRate: satPerByte.toString(),
              feeRateType: paymentsCommon.FeeRateType.BasePerWeight,
          };
      }
      async signTransaction(tx) {
          const keyPair = this.getKeyPair(tx.fromIndex);
          const { inputs, outputs } = tx.data;
          let redeemScript = undefined;
          let prevOutScript = undefined;
          if (this.addressType === exports.AddressType.SegwitP2SH) {
              redeemScript = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey }).output;
          }
          else if (this.addressType === exports.AddressType.SegwitNative) {
              prevOutScript = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey }).output;
          }
          let builder = new bitcoin.TransactionBuilder(this.bitcoinjsNetwork);
          for (let output of outputs) {
              builder.addOutput(output.address, toBaseDenominationNumber(output.value));
          }
          for (let i = 0; i < inputs.length; i++) {
              const input = inputs[i];
              builder.addInput(input.txid, input.vout, undefined, prevOutScript);
          }
          for (let i = 0; i < inputs.length; i++) {
              const input = inputs[i];
              builder.sign(i, keyPair, redeemScript, undefined, toBaseDenominationNumber(input.value));
          }
          const built = builder.build();
          const txId = built.getId();
          const txHex = built.toHex();
          return {
              ...tx,
              status: paymentsCommon.TransactionStatus.Signed,
              id: txId,
              data: {
                  hex: txHex,
              },
          };
      }
  }

  function splitDerivationPath(path) {
      let parts = path.split('/');
      if (parts[0] === 'm') {
          return parts.slice(1);
      }
      return parts;
  }
  function deriveHDNode(hdKey, derivationPath, network) {
      const rootNode = bip32.fromBase58(hdKey, network);
      const parts = splitDerivationPath(derivationPath).slice(rootNode.depth);
      let node = rootNode;
      if (parts.length > 0) {
          node = rootNode.derivePath(parts.join('/'));
      }
      return node;
  }
  function deriveKeyPair(baseNode, index, network) {
      return baseNode.derive(0).derive(index);
  }
  function deriveAddress(baseNode, index, network, addressType) {
      const keyPair = deriveKeyPair(baseNode, index);
      return publicKeyToAddress(keyPair.publicKey, network, addressType);
  }
  function xprvToXpub(xprv, derivationPath, network) {
      const node = deriveHDNode(xprv, derivationPath, network);
      return node.neutered().toBase58();
  }

  class HdBitcoinPayments extends BaseBitcoinPayments {
      constructor(config) {
          super(config);
          this.config = config;
          tsCommon.assertType(HdBitcoinPaymentsConfig, config);
          this.derivationPath = config.derivationPath || DEFAULT_DERIVATION_PATHS[this.addressType];
          if (this.isValidXpub(config.hdKey)) {
              this.xpub = config.hdKey;
              this.xprv = null;
          }
          else if (this.isValidXprv(config.hdKey)) {
              this.xpub = xprvToXpub(config.hdKey, this.derivationPath, this.bitcoinjsNetwork);
              this.xprv = config.hdKey;
          }
          else {
              const providedPrefix = config.hdKey.slice(0, 4);
              const xpubPrefix = bip32MagicNumberToPrefix(this.bitcoinjsNetwork.bip32.public);
              const xprvPrefix = bip32MagicNumberToPrefix(this.bitcoinjsNetwork.bip32.private);
              let reason = '';
              if (providedPrefix !== xpubPrefix && providedPrefix !== xprvPrefix) {
                  reason = ` with prefix ${providedPrefix} but expected ${xprvPrefix} or ${xpubPrefix}`;
              }
              else {
                  reason = ` (${validateHdKey(config.hdKey, this.bitcoinjsNetwork)})`;
              }
              throw new Error(`Invalid ${this.networkType} hdKey provided to bitcoin payments config${reason}`);
          }
          this.hdNode = deriveHDNode(config.hdKey, this.derivationPath, this.bitcoinjsNetwork);
      }
      isValidXprv(xprv) {
          return isValidXprv(xprv, this.bitcoinjsNetwork);
      }
      isValidXpub(xpub) {
          return isValidXpub(xpub, this.bitcoinjsNetwork);
      }
      getFullConfig() {
          return {
              ...this.config,
              derivationPath: this.derivationPath,
              addressType: this.addressType,
          };
      }
      getPublicConfig() {
          return {
              ...lodash.omit(this.getFullConfig(), ['logger', 'server', 'hdKey']),
              hdKey: this.xpub,
          };
      }
      getAccountId(index) {
          return this.xpub;
      }
      getAccountIds() {
          return [this.xpub];
      }
      getAddress(index) {
          return deriveAddress(this.hdNode, index, this.bitcoinjsNetwork, this.addressType);
      }
      getKeyPair(index) {
          if (!this.xprv) {
              throw new Error(`Cannot get private key ${index} - HdBitcoinPayments was created with an xpub`);
          }
          return deriveKeyPair(this.hdNode, index, this.bitcoinjsNetwork);
      }
  }

  class BitcoinPaymentsUtils extends BitcoinishPaymentsUtils {
      constructor(config = {}) {
          super(toBitcoinishConfig(config));
      }
      async isValidAddress(address) {
          return isValidAddress(address, this.bitcoinjsNetwork);
      }
      async isValidPrivateKey(privateKey) {
          return isValidPrivateKey(privateKey, this.bitcoinjsNetwork);
      }
  }

  class BitcoinPaymentsFactory {
      forConfig(config) {
          if (HdBitcoinPaymentsConfig.is(config)) {
              return new HdBitcoinPayments(config);
          }
          throw new Error('Cannot instantiate bitcoin payments for unsupported config');
      }
  }

  Object.defineProperty(exports, 'UtxoInfo', {
    enumerable: true,
    get: function () {
      return paymentsCommon.UtxoInfo;
    }
  });
  exports.AddressTypeT = AddressTypeT;
  exports.BaseBitcoinPayments = BaseBitcoinPayments;
  exports.BaseBitcoinPaymentsConfig = BaseBitcoinPaymentsConfig;
  exports.BitcoinBlock = BitcoinBlock;
  exports.BitcoinBroadcastResult = BitcoinBroadcastResult;
  exports.BitcoinPaymentsConfig = BitcoinPaymentsConfig;
  exports.BitcoinPaymentsFactory = BitcoinPaymentsFactory;
  exports.BitcoinPaymentsUtils = BitcoinPaymentsUtils;
  exports.BitcoinPaymentsUtilsConfig = BitcoinPaymentsUtilsConfig;
  exports.BitcoinSignedTransaction = BitcoinSignedTransaction;
  exports.BitcoinTransactionInfo = BitcoinTransactionInfo;
  exports.BitcoinUnsignedTransaction = BitcoinUnsignedTransaction;
  exports.BitcoinUnsignedTransactionData = BitcoinUnsignedTransactionData;
  exports.BitcoinishBlock = BitcoinishBlock;
  exports.BitcoinishBroadcastResult = BitcoinishBroadcastResult;
  exports.BitcoinishPaymentTx = BitcoinishPaymentTx;
  exports.BitcoinishSignedTransaction = BitcoinishSignedTransaction;
  exports.BitcoinishTransactionInfo = BitcoinishTransactionInfo;
  exports.BitcoinishTxOutput = BitcoinishTxOutput;
  exports.BitcoinishUnsignedTransaction = BitcoinishUnsignedTransaction;
  exports.BlockbookConfigServer = BlockbookConfigServer;
  exports.BlockbookConnectedConfig = BlockbookConnectedConfig;
  exports.BlockbookServerAPI = BlockbookServerAPI;
  exports.COIN_NAME = COIN_NAME;
  exports.COIN_SYMBOL = COIN_SYMBOL;
  exports.DECIMAL_PLACES = DECIMAL_PLACES;
  exports.DEFAULT_ADDRESS_TYPE = DEFAULT_ADDRESS_TYPE;
  exports.DEFAULT_DERIVATION_PATHS = DEFAULT_DERIVATION_PATHS;
  exports.DEFAULT_DUST_THRESHOLD = DEFAULT_DUST_THRESHOLD;
  exports.DEFAULT_FEE_LEVEL = DEFAULT_FEE_LEVEL;
  exports.DEFAULT_MAINNET_SERVER = DEFAULT_MAINNET_SERVER;
  exports.DEFAULT_MIN_TX_FEE = DEFAULT_MIN_TX_FEE;
  exports.DEFAULT_NETWORK = DEFAULT_NETWORK;
  exports.DEFAULT_NETWORK_MIN_RELAY_FEE = DEFAULT_NETWORK_MIN_RELAY_FEE;
  exports.DEFAULT_SAT_PER_BYTE_LEVELS = DEFAULT_SAT_PER_BYTE_LEVELS;
  exports.DEFAULT_TESTNET_SERVER = DEFAULT_TESTNET_SERVER;
  exports.HdBitcoinPayments = HdBitcoinPayments;
  exports.HdBitcoinPaymentsConfig = HdBitcoinPaymentsConfig;
  exports.NETWORK_MAINNET = NETWORK_MAINNET;
  exports.NETWORK_TESTNET = NETWORK_TESTNET;
  exports.PACKAGE_NAME = PACKAGE_NAME;
  exports.isValidAddress = isValidAddress;
  exports.isValidExtraId = isValidExtraId;
  exports.isValidPrivateKey = isValidPrivateKey;
  exports.isValidXprv = isValidXprv;
  exports.isValidXpub = isValidXpub;
  exports.privateKeyToAddress = privateKeyToAddress;
  exports.publicKeyToAddress = publicKeyToAddress;
  exports.toBaseDenominationBigNumber = toBaseDenominationBigNumber;
  exports.toBaseDenominationNumber = toBaseDenominationNumber;
  exports.toBaseDenominationString = toBaseDenominationString;
  exports.toMainDenominationBigNumber = toMainDenominationBigNumber;
  exports.toMainDenominationNumber = toMainDenominationNumber;
  exports.toMainDenominationString = toMainDenominationString;
  exports.validateHdKey = validateHdKey;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=index.umd.js.map
