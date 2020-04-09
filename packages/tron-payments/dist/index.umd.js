(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('tronweb'), require('lodash'), require('@faast/payments-common'), require('@faast/ts-common'), require('io-ts'), require('bip32'), require('js-sha3'), require('jssha'), require('elliptic'), require('crypto')) :
  typeof define === 'function' && define.amd ? define(['exports', 'tronweb', 'lodash', '@faast/payments-common', '@faast/ts-common', 'io-ts', 'bip32', 'js-sha3', 'jssha', 'elliptic', 'crypto'], factory) :
  (global = global || self, factory(global.faastTronPayments = {}, global.TronWeb, global.lodash, global.paymentsCommon, global.tsCommon, global.t, global.bip32, global.jsSha3, global.jsSHA, global.elliptic, global.crypto));
}(this, (function (exports, TronWeb, lodash, paymentsCommon, tsCommon, t, bip32, jsSha3, jsSHA, elliptic, crypto) { 'use strict';

  TronWeb = TronWeb && TronWeb.hasOwnProperty('default') ? TronWeb['default'] : TronWeb;
  jsSHA = jsSHA && jsSHA.hasOwnProperty('default') ? jsSHA['default'] : jsSHA;
  crypto = crypto && crypto.hasOwnProperty('default') ? crypto['default'] : crypto;

  const PACKAGE_NAME = 'tron-payments';
  const MIN_BALANCE_SUN = 100000;
  const MIN_BALANCE_TRX = MIN_BALANCE_SUN / 1e6;
  const DECIMAL_PLACES = 6;
  const DEFAULT_FULL_NODE = process.env.TRX_FULL_NODE_URL || 'https://api.trongrid.io';
  const DEFAULT_SOLIDITY_NODE = process.env.TRX_SOLIDITY_NODE_URL || 'https://api.trongrid.io';
  const DEFAULT_EVENT_SERVER = process.env.TRX_EVENT_SERVER_URL || 'https://api.trongrid.io';
  const DEFAULT_FEE_LEVEL = paymentsCommon.FeeLevel.Medium;
  const TX_EXPIRATION_EXTENSION_SECONDS = 4 * 60;
  const EXPIRATION_FUDGE_MS = 10 * 1000;

  const { toMainDenominationBigNumber, toMainDenominationString, toMainDenominationNumber, toBaseDenominationBigNumber, toBaseDenominationString, toBaseDenominationNumber, } = paymentsCommon.createUnitConverters(DECIMAL_PLACES);
  function isValidXprv(xprv) {
      return xprv.startsWith('xprv');
  }
  function isValidXpub(xpub) {
      return xpub.startsWith('xpub');
  }
  function isValidAddress(address) {
      return TronWeb.isAddress(address);
  }
  function isValidExtraId(extraId) {
      return false;
  }
  function isValidPrivateKey(privateKey) {
      try {
          privateKeyToAddress(privateKey);
          return true;
      }
      catch (e) {
          return false;
      }
  }
  function privateKeyToAddress(privateKey) {
      const address = TronWeb.address.fromPrivateKey(privateKey);
      if (isValidAddress(address)) {
          return address;
      }
      else {
          throw new Error('Validation failed for address derived from private key');
      }
  }

  function toError(e) {
      if (typeof e === 'string') {
          return new Error(e);
      }
      return e;
  }

  const BaseTronPaymentsConfig = tsCommon.extendCodec(paymentsCommon.BaseConfig, {}, {
      fullNode: t.string,
      solidityNode: t.string,
      eventServer: t.string,
  }, 'BaseTronPaymentsConfig');
  const HdTronPaymentsConfig = tsCommon.extendCodec(BaseTronPaymentsConfig, {
      hdKey: t.string,
  }, 'HdTronPaymentsConfig');
  const NullableOptionalString = t.union([t.string, t.null, t.undefined]);
  const KeyPairTronPaymentsConfig = tsCommon.extendCodec(BaseTronPaymentsConfig, {
      keyPairs: t.union([t.array(NullableOptionalString), t.record(t.number, NullableOptionalString)]),
  }, 'KeyPairTronPaymentsConfig');
  const TronPaymentsConfig = t.union([HdTronPaymentsConfig, KeyPairTronPaymentsConfig], 'TronPaymentsConfig');
  const TronUnsignedTransaction = tsCommon.extendCodec(paymentsCommon.BaseUnsignedTransaction, {
      id: t.string,
      amount: t.string,
      fee: t.string,
  }, 'TronUnsignedTransaction');
  const TronSignedTransaction = tsCommon.extendCodec(paymentsCommon.BaseSignedTransaction, {}, {}, 'TronSignedTransaction');
  const TronTransactionInfo = tsCommon.extendCodec(paymentsCommon.BaseTransactionInfo, {}, {}, 'TronTransactionInfo');
  const TronBroadcastResult = tsCommon.extendCodec(paymentsCommon.BaseBroadcastResult, {
      rebroadcast: t.boolean,
  }, 'TronBroadcastResult');

  class TronPaymentsUtils {
      constructor(config = {}) {
          this.isValidXprv = isValidXprv;
          this.isValidXpub = isValidXpub;
          this.isValidPrivateKey = isValidPrivateKey;
          this.privateKeyToAddress = privateKeyToAddress;
          tsCommon.assertType(BaseTronPaymentsConfig, config);
          this.networkType = config.network || paymentsCommon.NetworkType.Mainnet;
          this.logger = new tsCommon.DelegateLogger(config.logger, PACKAGE_NAME);
      }
      async isValidExtraId(extraId) {
          return isValidExtraId();
      }
      async isValidAddress(address) {
          return isValidAddress(address);
      }
      async _getPayportValidationMessage(payport) {
          const { address, extraId } = payport;
          if (!isValidAddress(address)) {
              return 'Invalid payport address';
          }
          if (!tsCommon.isNil(extraId) && !isValidExtraId()) {
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
          return toMainDenominationString(amount);
      }
      toBaseDenomination(amount) {
          return toBaseDenominationString(amount);
      }
  }

  class BaseTronPayments extends TronPaymentsUtils {
      constructor(config) {
          super(config);
          this.fullNode = config.fullNode || DEFAULT_FULL_NODE;
          this.solidityNode = config.solidityNode || DEFAULT_SOLIDITY_NODE;
          this.eventServer = config.eventServer || DEFAULT_EVENT_SERVER;
          this.tronweb = new TronWeb(this.fullNode, this.solidityNode, this.eventServer);
      }
      async init() { }
      async destroy() { }
      requiresBalanceMonitor() {
          return false;
      }
      async getBalance(resolveablePayport) {
          try {
              const payport = await this.resolvePayport(resolveablePayport);
              const balanceSun = await this.tronweb.trx.getBalance(payport.address);
              this.logger.debug(`trx.getBalance(${payport.address}) -> ${balanceSun}`);
              const sweepable = this.canSweepBalance(balanceSun);
              return {
                  confirmedBalance: this.toMainDenomination(balanceSun).toString(),
                  unconfirmedBalance: '0',
                  sweepable,
              };
          }
          catch (e) {
              throw toError(e);
          }
      }
      async resolveFeeOption(feeOption) {
          let targetFeeLevel;
          if (tsCommon.isType(paymentsCommon.FeeOptionCustom, feeOption)) {
              if (feeOption.feeRate !== '0') {
                  throw new Error('tron-payments custom fees are unsupported');
              }
              targetFeeLevel = paymentsCommon.FeeLevel.Custom;
          }
          else {
              targetFeeLevel = feeOption.feeLevel || DEFAULT_FEE_LEVEL;
          }
          return {
              targetFeeLevel,
              targetFeeRate: '0',
              targetFeeRateType: paymentsCommon.FeeRateType.Base,
              feeBase: '0',
              feeMain: '0',
          };
      }
      async buildUnsignedTx(toAddress, amountSun, fromAddress) {
          let tx = await this.tronweb.transactionBuilder.sendTrx(toAddress, amountSun, fromAddress);
          tx = await this.tronweb.transactionBuilder.extendExpiration(tx, TX_EXPIRATION_EXTENSION_SECONDS);
          return tx;
      }
      async createSweepTransaction(from, to, options = {}) {
          this.logger.debug('createSweepTransaction', from, to);
          try {
              const { fromAddress, fromIndex, fromPayport, toAddress, toIndex } = await this.resolveFromTo(from, to);
              const { targetFeeLevel, targetFeeRate, targetFeeRateType, feeBase, feeMain } = await this.resolveFeeOption(options);
              const feeSun = Number.parseInt(feeBase);
              const { confirmedBalance: balanceTrx } = await this.getBalance(fromPayport);
              const balanceSun = toBaseDenominationNumber(balanceTrx);
              if (!this.canSweepBalance(balanceSun)) {
                  throw new Error(`Insufficient balance (${balanceTrx}) to sweep with fee of ${feeMain} ` +
                      `while maintaining a minimum required balance of ${MIN_BALANCE_TRX}`);
              }
              const amountSun = balanceSun - feeSun - MIN_BALANCE_SUN;
              const amountTrx = this.toMainDenomination(amountSun);
              const tx = await this.buildUnsignedTx(toAddress, amountSun, fromAddress);
              return {
                  status: paymentsCommon.TransactionStatus.Unsigned,
                  id: tx.txID,
                  fromAddress,
                  toAddress,
                  toExtraId: null,
                  fromIndex,
                  toIndex,
                  amount: amountTrx,
                  fee: feeMain,
                  targetFeeLevel,
                  targetFeeRate,
                  targetFeeRateType,
                  sequenceNumber: null,
                  data: tx,
              };
          }
          catch (e) {
              throw toError(e);
          }
      }
      async createTransaction(from, to, amountTrx, options = {}) {
          this.logger.debug('createTransaction', from, to, amountTrx);
          try {
              const { fromAddress, fromIndex, fromPayport, toAddress, toIndex } = await this.resolveFromTo(from, to);
              const { targetFeeLevel, targetFeeRate, targetFeeRateType, feeBase, feeMain } = await this.resolveFeeOption(options);
              const feeSun = Number.parseInt(feeBase);
              const { confirmedBalance: balanceTrx } = await this.getBalance(fromPayport);
              const balanceSun = toBaseDenominationNumber(balanceTrx);
              const amountSun = toBaseDenominationNumber(amountTrx);
              if (balanceSun - feeSun - MIN_BALANCE_SUN < amountSun) {
                  throw new Error(`Insufficient balance (${balanceTrx}) to send ${amountTrx} including fee of ${feeMain} ` +
                      `while maintaining a minimum required balance of ${MIN_BALANCE_TRX}`);
              }
              const tx = await this.buildUnsignedTx(toAddress, amountSun, fromAddress);
              return {
                  status: paymentsCommon.TransactionStatus.Unsigned,
                  id: tx.txID,
                  fromAddress,
                  toAddress,
                  toExtraId: null,
                  fromIndex,
                  toIndex,
                  amount: amountTrx,
                  fee: feeMain,
                  targetFeeLevel,
                  targetFeeRate,
                  targetFeeRateType,
                  sequenceNumber: null,
                  data: tx,
              };
          }
          catch (e) {
              throw toError(e);
          }
      }
      async signTransaction(unsignedTx) {
          try {
              const fromPrivateKey = await this.getPrivateKey(unsignedTx.fromIndex);
              const unsignedRaw = lodash.cloneDeep(unsignedTx.data);
              const signedTx = await this.tronweb.trx.sign(unsignedRaw, fromPrivateKey);
              return {
                  ...unsignedTx,
                  status: paymentsCommon.TransactionStatus.Signed,
                  data: signedTx,
              };
          }
          catch (e) {
              throw toError(e);
          }
      }
      async broadcastTransaction(tx) {
          try {
              const status = await this.tronweb.trx.sendRawTransaction(tx.data);
              let success = false;
              let rebroadcast = false;
              if (status.result || status.code === 'SUCCESS') {
                  success = true;
              }
              else {
                  try {
                      await this.tronweb.trx.getTransaction(tx.id);
                      success = true;
                      rebroadcast = true;
                  }
                  catch (e) {
                      const expiration = tx.data && tx.data.raw_data.expiration;
                      if (expiration && Date.now() > expiration + EXPIRATION_FUDGE_MS) {
                          throw new paymentsCommon.PaymentsError(paymentsCommon.PaymentsErrorCode.TxExpired, 'Transaction has expired');
                      }
                  }
              }
              if (success) {
                  return {
                      id: tx.id,
                      rebroadcast,
                  };
              }
              else {
                  let statusCode = status.code;
                  if (statusCode === 'TRANSACTION_EXPIRATION_ERROR') {
                      throw new paymentsCommon.PaymentsError(paymentsCommon.PaymentsErrorCode.TxExpired, `${statusCode} ${status.message || ''}`);
                  }
                  if (statusCode === 'DUP_TRANSACTION_ERROR') {
                      statusCode = 'DUP_TX_BUT_TX_NOT_FOUND_SO_PROBABLY_INVALID_TX_ERROR';
                  }
                  this.logger.warn(`Tron broadcast tx unsuccessful ${tx.id}`, status);
                  throw new Error(`Failed to broadcast transaction: ${statusCode} ${status.message}`);
              }
          }
          catch (e) {
              throw toError(e);
          }
      }
      async getTransactionInfo(txid) {
          try {
              const [tx, txInfo, currentBlock] = await Promise.all([
                  this.tronweb.trx.getTransaction(txid),
                  this.tronweb.trx.getTransactionInfo(txid),
                  this.tronweb.trx.getCurrentBlock(),
              ]);
              const { amountTrx, fromAddress, toAddress } = this.extractTxFields(tx);
              const contractRet = lodash.get(tx, 'ret[0].contractRet');
              const isExecuted = contractRet === 'SUCCESS';
              const block = txInfo.blockNumber || null;
              const feeTrx = this.toMainDenomination(txInfo.fee || 0);
              const currentBlockNumber = lodash.get(currentBlock, 'block_header.raw_data.number', 0);
              const confirmations = currentBlockNumber && block ? currentBlockNumber - block : 0;
              const isConfirmed = confirmations > 0;
              const confirmationTimestamp = txInfo.blockTimeStamp ? new Date(txInfo.blockTimeStamp) : null;
              let status = paymentsCommon.TransactionStatus.Pending;
              if (isConfirmed) {
                  if (!isExecuted) {
                      status = paymentsCommon.TransactionStatus.Failed;
                  }
                  status = paymentsCommon.TransactionStatus.Confirmed;
              }
              return {
                  id: tx.txID,
                  amount: amountTrx,
                  toAddress,
                  fromAddress,
                  toExtraId: null,
                  fromIndex: null,
                  toIndex: null,
                  fee: feeTrx,
                  sequenceNumber: null,
                  isExecuted,
                  isConfirmed,
                  confirmations,
                  confirmationId: block ? String(block) : null,
                  confirmationTimestamp,
                  status,
                  data: {
                      ...tx,
                      ...txInfo,
                      currentBlock: lodash.pick(currentBlock, 'block_header', 'blockID'),
                  },
              };
          }
          catch (e) {
              throw toError(e);
          }
      }
      isSweepableBalance(balanceTrx) {
          return this.canSweepBalance(toBaseDenominationNumber(balanceTrx));
      }
      usesSequenceNumber() {
          return false;
      }
      async getNextSequenceNumber() {
          return null;
      }
      usesUtxos() {
          return false;
      }
      async getUtxos() {
          return [];
      }
      canSweepBalance(balanceSun) {
          return balanceSun > MIN_BALANCE_SUN;
      }
      extractTxFields(tx) {
          const contractParam = lodash.get(tx, 'raw_data.contract[0].parameter.value');
          if (!(contractParam && typeof contractParam.amount === 'number')) {
              throw new Error('Unable to get transaction');
          }
          const amountSun = contractParam.amount || 0;
          const amountTrx = this.toMainDenomination(amountSun);
          const toAddress = this.tronweb.address.fromHex(contractParam.to_address);
          const fromAddress = this.tronweb.address.fromHex(contractParam.owner_address);
          return {
              amountTrx,
              amountSun,
              toAddress,
              fromAddress,
          };
      }
      async resolvePayport(payport) {
          if (typeof payport === 'number') {
              return this.getPayport(payport);
          }
          else if (typeof payport === 'string') {
              if (!isValidAddress(payport)) {
                  throw new Error(`Invalid TRON address: ${payport}`);
              }
              return { address: payport };
          }
          if (!this.isValidPayport(payport)) {
              throw new Error(`Invalid TRON payport: ${JSON.stringify(payport)}`);
          }
          return payport;
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
  }

  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const ALPHABET_MAP = {};
  for (let i = 0; i < ALPHABET.length; i++) {
      ALPHABET_MAP[ALPHABET.charAt(i)] = i;
  }
  const BASE = 58;
  function encode58(buffer) {
      if (buffer.length === 0) {
          return '';
      }
      let i;
      let j;
      const digits = [0];
      for (i = 0; i < buffer.length; i++) {
          for (j = 0; j < digits.length; j++) {
              digits[j] <<= 8;
          }
          digits[0] += buffer[i];
          let carry = 0;
          for (j = 0; j < digits.length; ++j) {
              digits[j] += carry;
              carry = (digits[j] / BASE) | 0;
              digits[j] %= BASE;
          }
          while (carry) {
              digits.push(carry % BASE);
              carry = (carry / BASE) | 0;
          }
      }
      for (i = 0; buffer[i] === 0 && i < buffer.length - 1; i++) {
          digits.push(0);
      }
      return digits
          .reverse()
          .map(digit => ALPHABET[digit])
          .join('');
  }
  function decode58(s) {
      if (s.length === 0) {
          return [];
      }
      let i;
      let j;
      const bytes = [0];
      for (i = 0; i < s.length; i++) {
          const c = s[i];
          if (!(c in ALPHABET_MAP)) {
              throw new Error('Non-base58 character');
          }
          for (j = 0; j < bytes.length; j++) {
              bytes[j] *= BASE;
          }
          bytes[0] += ALPHABET_MAP[c];
          let carry = 0;
          for (j = 0; j < bytes.length; ++j) {
              bytes[j] += carry;
              carry = bytes[j] >> 8;
              bytes[j] &= 0xff;
          }
          while (carry) {
              bytes.push(carry & 0xff);
              carry >>= 8;
          }
      }
      for (i = 0; s[i] === '1' && i < s.length - 1; i++) {
          bytes.push(0);
      }
      return bytes.reverse();
  }

  const ec = new elliptic.ec('secp256k1');
  const derivationPath = "m/44'/195'/0'";
  const derivationPathParts = derivationPath.split('/').slice(1);
  function deriveAddress(xpub, index) {
      if (!isValidXpub(xpub)) {
          throw new Error('Invalid xpub');
      }
      const key = bip32.fromBase58(xpub);
      const derived = deriveBasePath(key)
          .derive(0)
          .derive(index);
      return hdPublicKeyToAddress(derived);
  }
  function derivePrivateKey(xprv, index) {
      if (!isValidXprv(xprv)) {
          throw new Error('Invalid xprv');
      }
      const key = bip32.fromBase58(xprv);
      const derived = deriveBasePath(key)
          .derive(0)
          .derive(index);
      return hdPrivateKeyToPrivateKey(derived);
  }
  function xprvToXpub(xprv) {
      const key = typeof xprv === 'string' ? bip32.fromBase58(xprv) : xprv;
      const derivedPubKey = deriveBasePath(key);
      return derivedPubKey.neutered().toBase58();
  }
  function generateNewKeys() {
      const key = bip32.fromSeed(crypto.randomBytes(32));
      const xprv = key.toBase58();
      const xpub = xprvToXpub(xprv);
      return {
          xprv,
          xpub,
      };
  }
  function deriveBasePath(key) {
      const parts = derivationPathParts.slice(key.depth);
      if (parts.length > 0) {
          return key.derivePath(`m/${parts.join('/')}`);
      }
      return key;
  }
  function hdPublicKeyToAddress(key) {
      return addressBytesToB58CheckAddress(pubBytesToTronBytes(bip32PublicToTronPublic(key.publicKey)));
  }
  function hdPrivateKeyToPrivateKey(key) {
      if (key.isNeutered() || typeof key.privateKey === 'undefined') {
          throw new Error('Invalid HD private key, must not be neutered');
      }
      return bip32PrivateToTronPrivate(key.privateKey);
  }
  function bip32PublicToTronPublic(pubKey) {
      const pubkey = ec.keyFromPublic(pubKey).getPublic();
      const x = pubkey.getX();
      const y = pubkey.getY();
      let xHex = x.toString('hex');
      while (xHex.length < 64) {
          xHex = `0${xHex}`;
      }
      let yHex = y.toString('hex');
      while (yHex.length < 64) {
          yHex = `0${yHex}`;
      }
      const pubkeyHex = `04${xHex}${yHex}`;
      const pubkeyBytes = hexStr2byteArray(pubkeyHex);
      return pubkeyBytes;
  }
  function bip32PrivateToTronPrivate(priKeyBytes) {
      const key = ec.keyFromPrivate(priKeyBytes, 'bytes');
      let priKeyHex = key.getPrivate('hex');
      while (priKeyHex.length < 64) {
          priKeyHex = `0${priKeyHex}`;
      }
      let privArray = hexStr2byteArray(priKeyHex);
      return byteArray2hexStr(privArray);
  }
  const ADDRESS_PREFIX = '41';
  function byte2hexStr(byte) {
      const hexByteMap = '0123456789ABCDEF';
      let str = '';
      str += hexByteMap.charAt(byte >> 4);
      str += hexByteMap.charAt(byte & 0x0f);
      return str;
  }
  function hexStr2byteArray(str) {
      const byteArray = Array();
      let d = 0;
      let j = 0;
      let k = 0;
      for (let i = 0; i < str.length; i++) {
          const c = str.charAt(i);
          if (isHexChar(c)) {
              d <<= 4;
              d += hexChar2byte(c);
              j++;
              if (0 === j % 2) {
                  byteArray[k++] = d;
                  d = 0;
              }
          }
      }
      return byteArray;
  }
  function isHexChar(c) {
      return (c >= 'A' && c <= 'F') || (c >= 'a' && c <= 'f') || (c >= '0' && c <= '9');
  }
  function hexChar2byte(c) {
      let d = 0;
      if (c >= 'A' && c <= 'F') {
          d = c.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
      }
      else if (c >= 'a' && c <= 'f') {
          d = c.charCodeAt(0) - 'a'.charCodeAt(0) + 10;
      }
      else if (c >= '0' && c <= '9') {
          d = c.charCodeAt(0) - '0'.charCodeAt(0);
      }
      return d;
  }
  function byteArray2hexStr(byteArray) {
      let str = '';
      for (let i = 0; i < byteArray.length; i++) {
          str += byte2hexStr(byteArray[i]);
      }
      return str;
  }
  function pubBytesToTronBytes(pubBytes) {
      if (pubBytes.length === 65) {
          pubBytes = pubBytes.slice(1);
      }
      const hash = jsSha3.keccak256(pubBytes).toString();
      const addressHex = ADDRESS_PREFIX + hash.substring(24);
      return hexStr2byteArray(addressHex);
  }
  function addressBytesToB58CheckAddress(addressBytes) {
      const hash0 = SHA256(addressBytes);
      const hash1 = SHA256(hash0);
      let checkSum = hash1.slice(0, 4);
      checkSum = addressBytes.concat(checkSum);
      return encode58(checkSum);
  }
  function SHA256(msgBytes) {
      const shaObj = new jsSHA('SHA-256', 'HEX');
      const msgHex = byteArray2hexStr(msgBytes);
      shaObj.update(msgHex);
      const hashHex = shaObj.getHash('HEX');
      return hexStr2byteArray(hashHex);
  }

  class HdTronPayments extends BaseTronPayments {
      constructor(config) {
          super(config);
          this.config = config;
          if (isValidXprv(config.hdKey)) {
              this.xprv = config.hdKey;
              this.xpub = xprvToXpub(this.xprv);
          }
          else if (isValidXpub(config.hdKey)) {
              this.xprv = null;
              this.xpub = config.hdKey;
          }
          else {
              throw new Error('Account must be a valid xprv or xpub');
          }
      }
      getXpub() {
          return this.xpub;
      }
      getFullConfig() {
          return this.config;
      }
      getPublicConfig() {
          return {
              ...lodash.omit(this.config, ['logger', 'fullNode', 'solidityNode', 'eventServer', 'hdKey']),
              hdKey: this.getXpub(),
          };
      }
      getAccountId(index) {
          return this.getXpub();
      }
      getAccountIds() {
          return [this.getXpub()];
      }
      async getPayport(index) {
          const xpub = this.getXpub();
          const address = deriveAddress(xpub, index);
          if (!isValidAddress(address)) {
              throw new Error(`Cannot get address ${index} - validation failed for derived address`);
          }
          return { address };
      }
      async getPrivateKey(index) {
          if (!this.xprv) {
              throw new Error(`Cannot get private key ${index} - HdTronPayments was created with an xpub`);
          }
          return derivePrivateKey(this.xprv, index);
      }
  }
  HdTronPayments.generateNewKeys = generateNewKeys;

  class KeyPairTronPayments extends BaseTronPayments {
      constructor(config) {
          super(config);
          this.config = config;
          this.addresses = {};
          this.privateKeys = {};
          this.addressIndices = {};
          Object.entries(config.keyPairs).forEach(([iString, addressOrKey]) => {
              if (typeof addressOrKey === 'undefined' || addressOrKey === null) {
                  return;
              }
              const i = Number.parseInt(iString);
              if (isValidAddress(addressOrKey)) {
                  this.addresses[i] = addressOrKey;
                  this.privateKeys[i] = null;
                  this.addressIndices[addressOrKey] = i;
                  return;
              }
              if (isValidPrivateKey(addressOrKey)) {
                  const address = privateKeyToAddress(addressOrKey);
                  this.addresses[i] = address;
                  this.privateKeys[i] = addressOrKey;
                  this.addressIndices[address] = i;
                  return;
              }
              throw new Error(`KeyPairTronPaymentsConfig.keyPairs[${i}] is not a valid private key or address`);
          });
      }
      getFullConfig() {
          return this.config;
      }
      getPublicConfig() {
          return {
              ...lodash.omit(this.config, ['logger', 'fullNode', 'solidityNode', 'eventServer']),
              keyPairs: this.addresses,
          };
      }
      getAccountId(index) {
          const accountId = this.addresses[index];
          if (!accountId) {
              throw new Error(`No KeyPairTronPayments account configured at index ${index}`);
          }
          return accountId;
      }
      getAccountIds() {
          return Object.keys(this.addressIndices);
      }
      async getPayport(index) {
          const address = this.addresses[index];
          if (typeof address === 'undefined') {
              throw new Error(`Cannot get address ${index} - keyPair[${index}] is undefined`);
          }
          return { address };
      }
      async getPrivateKey(index) {
          const privateKey = this.privateKeys[index];
          if (typeof privateKey === 'undefined') {
              throw new Error(`Cannot get private key ${index} - keyPair[${index}] is undefined`);
          }
          if (privateKey === null) {
              throw new Error(`Cannot get private key ${index} - keyPair[${index}] is a public address`);
          }
          return privateKey;
      }
  }

  class TronPaymentsFactory {
      forConfig(config) {
          if (HdTronPaymentsConfig.is(config)) {
              return new HdTronPayments(config);
          }
          if (KeyPairTronPaymentsConfig.is(config)) {
              return new KeyPairTronPayments(config);
          }
          throw new Error('Cannot instantiate tron payments for unsupported config');
      }
  }

  Object.defineProperty(exports, 'CreateTransactionOptions', {
    enumerable: true,
    get: function () {
      return paymentsCommon.CreateTransactionOptions;
    }
  });
  exports.BaseTronPayments = BaseTronPayments;
  exports.BaseTronPaymentsConfig = BaseTronPaymentsConfig;
  exports.DECIMAL_PLACES = DECIMAL_PLACES;
  exports.DEFAULT_EVENT_SERVER = DEFAULT_EVENT_SERVER;
  exports.DEFAULT_FEE_LEVEL = DEFAULT_FEE_LEVEL;
  exports.DEFAULT_FULL_NODE = DEFAULT_FULL_NODE;
  exports.DEFAULT_SOLIDITY_NODE = DEFAULT_SOLIDITY_NODE;
  exports.EXPIRATION_FUDGE_MS = EXPIRATION_FUDGE_MS;
  exports.HdTronPayments = HdTronPayments;
  exports.HdTronPaymentsConfig = HdTronPaymentsConfig;
  exports.KeyPairTronPayments = KeyPairTronPayments;
  exports.KeyPairTronPaymentsConfig = KeyPairTronPaymentsConfig;
  exports.MIN_BALANCE_SUN = MIN_BALANCE_SUN;
  exports.MIN_BALANCE_TRX = MIN_BALANCE_TRX;
  exports.PACKAGE_NAME = PACKAGE_NAME;
  exports.TX_EXPIRATION_EXTENSION_SECONDS = TX_EXPIRATION_EXTENSION_SECONDS;
  exports.TronBroadcastResult = TronBroadcastResult;
  exports.TronPaymentsConfig = TronPaymentsConfig;
  exports.TronPaymentsFactory = TronPaymentsFactory;
  exports.TronPaymentsUtils = TronPaymentsUtils;
  exports.TronSignedTransaction = TronSignedTransaction;
  exports.TronTransactionInfo = TronTransactionInfo;
  exports.TronUnsignedTransaction = TronUnsignedTransaction;
  exports.decode58 = decode58;
  exports.derivationPath = derivationPath;
  exports.deriveAddress = deriveAddress;
  exports.derivePrivateKey = derivePrivateKey;
  exports.encode58 = encode58;
  exports.generateNewKeys = generateNewKeys;
  exports.isValidAddress = isValidAddress;
  exports.isValidExtraId = isValidExtraId;
  exports.isValidPrivateKey = isValidPrivateKey;
  exports.isValidXprv = isValidXprv;
  exports.isValidXpub = isValidXpub;
  exports.privateKeyToAddress = privateKeyToAddress;
  exports.toBaseDenominationBigNumber = toBaseDenominationBigNumber;
  exports.toBaseDenominationNumber = toBaseDenominationNumber;
  exports.toBaseDenominationString = toBaseDenominationString;
  exports.toMainDenominationBigNumber = toMainDenominationBigNumber;
  exports.toMainDenominationNumber = toMainDenominationNumber;
  exports.toMainDenominationString = toMainDenominationString;
  exports.xprvToXpub = xprvToXpub;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=index.umd.js.map
