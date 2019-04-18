(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('tronweb'), require('lodash'), require('bitcore-lib'), require('js-sha3'), require('jssha'), require('elliptic')) :
    typeof define === 'function' && define.amd ? define(['exports', 'tronweb', 'lodash', 'bitcore-lib', 'js-sha3', 'jssha', 'elliptic'], factory) :
    (factory((global.faast_tron_payments = {}),global.TronWeb,global.lodash,global.bitcoreLib,global.jsSha3,global.jsSHA,global.elliptic));
}(this, (function (exports,TronWeb,lodash,bitcoreLib,jsSha3,jsSHA,elliptic) { 'use strict';

    TronWeb = TronWeb && TronWeb.hasOwnProperty('default') ? TronWeb['default'] : TronWeb;
    jsSHA = jsSHA && jsSHA.hasOwnProperty('default') ? jsSHA['default'] : jsSHA;

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */
    /* global Reflect, Promise */

    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };

    function __extends(d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }

    var __assign = function() {
        __assign = Object.assign || function __assign(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };

    function __awaiter(thisArg, _arguments, P, generator) {
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }

    function __generator(thisArg, body) {
        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (_) try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
                if (y = 0, t) op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0: case 1: t = op; break;
                    case 4: _.label++; return { value: op[1], done: false };
                    case 5: _.label++; y = op[1]; op = [0]; continue;
                    case 7: op = _.ops.pop(); _.trys.pop(); continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                        if (t[2]) _.ops.pop();
                        _.trys.pop(); continue;
                }
                op = body.call(thisArg, _);
            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
        }
    }

    function toError(e) {
        if (typeof e === 'string') {
            return new Error(e);
        }
        return e;
    }
    function toMainDenominationNumber(amountSun) {
        return (typeof amountSun === 'number' ? amountSun : Number.parseInt(amountSun)) / 1e6;
    }
    function toMainDenomination(amountSun) {
        return toMainDenominationNumber(amountSun).toString();
    }
    function toBaseDenominationNumber(amountTrx) {
        return (typeof amountTrx === 'number' ? amountTrx : Number.parseFloat(amountTrx)) * 1e6;
    }
    function toBaseDenomination(amountTrx) {
        return toBaseDenominationNumber(amountTrx).toString();
    }
    function isValidXprv(xprv) {
        return xprv.startsWith('xprv');
    }
    function isValidXpub(xpub) {
        return xpub.startsWith('xpub');
    }

    var TRX_FEE_FOR_TRANSFER = Number.parseInt(process.env.TRX_FEE_FOR_TRANSFER || '1000');
    var TRX_FEE_FOR_TRANSFER_SUN = TRX_FEE_FOR_TRANSFER * 100;
    var DEFAULT_FULL_NODE = process.env.TRX_FULL_NODE_URL || 'http://54.236.37.243:8090';
    var DEFAULT_SOLIDITY_NODE = process.env.TRX_SOLIDITY_NODE_URL || 'http://47.89.187.247:8091';
    var DEFAULT_EVENT_SERVER = process.env.TRX_EVENT_SERVER_URL || 'https://api.trongrid.io';
    var DEFAULT_MAX_ADDRESS_SCAN = 10;

    var BaseTronPayments = (function () {
        function BaseTronPayments(config) {
            this.toMainDenomination = toMainDenomination;
            this.toBaseDenomination = toBaseDenomination;
            this.fullNode = config.fullNode || DEFAULT_FULL_NODE;
            this.solidityNode = config.solidityNode || DEFAULT_SOLIDITY_NODE;
            this.eventServer = config.eventServer || DEFAULT_EVENT_SERVER;
            this.tronweb = new TronWeb(this.fullNode, this.solidityNode, this.eventServer);
        }
        BaseTronPayments.prototype.isValidAddress = function (address) {
            return this.tronweb.isAddress(address);
        };
        BaseTronPayments.prototype.isValidPrivateKey = function (privateKey) {
            try {
                this.privateKeyToAddress(privateKey);
                return true;
            }
            catch (e) {
                return false;
            }
        };
        BaseTronPayments.prototype.privateKeyToAddress = function (privateKey) {
            var address = this.tronweb.address.fromPrivateKey(privateKey);
            if (this.isValidAddress(address)) {
                return address;
            }
            else {
                throw new Error('Validation failed for address derived from private key');
            }
        };
        BaseTronPayments.prototype.getAddressOrNull = function (index, options) {
            return __awaiter(this, void 0, void 0, function () {
                var e_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4, this.getAddress(index, options)];
                        case 1: return [2, _a.sent()];
                        case 2:
                            e_1 = _a.sent();
                            return [2, null];
                        case 3: return [2];
                    }
                });
            });
        };
        BaseTronPayments.prototype.getAddressIndexOrNull = function (address) {
            return __awaiter(this, void 0, void 0, function () {
                var e_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4, this.getAddressIndex(address)];
                        case 1: return [2, _a.sent()];
                        case 2:
                            e_2 = _a.sent();
                            return [2, null];
                        case 3: return [2];
                    }
                });
            });
        };
        BaseTronPayments.prototype.getBalance = function (addressOrIndex) {
            return __awaiter(this, void 0, void 0, function () {
                var address, balanceSun, e_3;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 3, , 4]);
                            return [4, this.resolveAddress(addressOrIndex)];
                        case 1:
                            address = _a.sent();
                            return [4, this.tronweb.trx.getBalance(address)];
                        case 2:
                            balanceSun = _a.sent();
                            return [2, {
                                    balance: toMainDenomination(balanceSun).toString(),
                                    unconfirmedBalance: '0',
                                }];
                        case 3:
                            e_3 = _a.sent();
                            throw toError(e_3);
                        case 4: return [2];
                    }
                });
            });
        };
        BaseTronPayments.prototype.canSweep = function (addressOrIndex) {
            return __awaiter(this, void 0, void 0, function () {
                var balance;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4, this.getBalance(addressOrIndex)];
                        case 1:
                            balance = (_a.sent()).balance;
                            return [2, this.canSweepBalance(toBaseDenominationNumber(balance))];
                    }
                });
            });
        };
        BaseTronPayments.prototype.createSweepTransaction = function (from, to, options) {
            if (options === void 0) { options = {}; }
            return __awaiter(this, void 0, void 0, function () {
                var _a, fromAddress, fromIndex, fromPrivateKey, toAddress, toIndex, feeSun, feeTrx, balanceSun, balanceTrx, amountSun, amountTrx, tx, e_4;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 4, , 5]);
                            return [4, this.resolveFromTo(from, to)];
                        case 1:
                            _a = _b.sent(), fromAddress = _a.fromAddress, fromIndex = _a.fromIndex, fromPrivateKey = _a.fromPrivateKey, toAddress = _a.toAddress, toIndex = _a.toIndex;
                            feeSun = options.fee || TRX_FEE_FOR_TRANSFER_SUN;
                            feeTrx = toMainDenomination(feeSun);
                            return [4, this.tronweb.trx.getBalance(fromAddress)];
                        case 2:
                            balanceSun = _b.sent();
                            balanceTrx = toMainDenomination(balanceSun);
                            if (!this.canSweepBalance(balanceSun)) {
                                throw new Error("Insufficient balance (" + balanceTrx + ") to sweep with fee of " + feeTrx);
                            }
                            amountSun = balanceSun - feeSun;
                            amountTrx = toMainDenomination(amountSun);
                            return [4, this.tronweb.transactionBuilder.sendTrx(toAddress, amountSun, fromAddress)];
                        case 3:
                            tx = _b.sent();
                            return [2, {
                                    id: tx.txID,
                                    from: fromAddress,
                                    to: toAddress,
                                    toExtraId: null,
                                    fromIndex: fromIndex,
                                    toIndex: toIndex,
                                    amount: amountTrx,
                                    fee: feeTrx,
                                    status: 'unsigned',
                                    rawUnsigned: tx,
                                }];
                        case 4:
                            e_4 = _b.sent();
                            throw toError(e_4);
                        case 5: return [2];
                    }
                });
            });
        };
        BaseTronPayments.prototype.createTransaction = function (from, to, amountTrx, options) {
            if (options === void 0) { options = {}; }
            return __awaiter(this, void 0, void 0, function () {
                var _a, fromAddress, fromIndex, toAddress, toIndex, feeSun, feeTrx, balanceSun, balanceTrx, amountSun, tx, e_5;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 4, , 5]);
                            return [4, this.resolveFromTo(from, to)];
                        case 1:
                            _a = _b.sent(), fromAddress = _a.fromAddress, fromIndex = _a.fromIndex, toAddress = _a.toAddress, toIndex = _a.toIndex;
                            feeSun = options.fee || TRX_FEE_FOR_TRANSFER_SUN;
                            feeTrx = toMainDenomination(feeSun);
                            return [4, this.tronweb.trx.getBalance(fromAddress)];
                        case 2:
                            balanceSun = _b.sent();
                            balanceTrx = toMainDenomination(balanceSun);
                            amountSun = toBaseDenominationNumber(amountTrx);
                            if ((balanceSun - feeSun) < amountSun) {
                                throw new Error("Insufficient balance (" + balanceTrx + ") to send including fee of " + feeTrx);
                            }
                            return [4, this.tronweb.transactionBuilder.sendTrx(toAddress, amountSun, fromAddress)];
                        case 3:
                            tx = _b.sent();
                            return [2, {
                                    id: tx.txID,
                                    from: fromAddress,
                                    to: toAddress,
                                    toExtraId: null,
                                    fromIndex: fromIndex,
                                    toIndex: toIndex,
                                    amount: amountTrx,
                                    fee: feeTrx,
                                    status: 'unsigned',
                                    rawUnsigned: tx,
                                }];
                        case 4:
                            e_5 = _b.sent();
                            throw toError(e_5);
                        case 5: return [2];
                    }
                });
            });
        };
        BaseTronPayments.prototype.signTransaction = function (unsignedTx) {
            return __awaiter(this, void 0, void 0, function () {
                var fromPrivateKey, unsignedRaw, signedTx, e_6;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 3, , 4]);
                            return [4, this.getPrivateKey(unsignedTx.fromIndex)];
                        case 1:
                            fromPrivateKey = _a.sent();
                            unsignedRaw = lodash.cloneDeep(unsignedTx.rawUnsigned);
                            return [4, this.tronweb.trx.sign(unsignedRaw, fromPrivateKey)];
                        case 2:
                            signedTx = _a.sent();
                            return [2, __assign({}, unsignedTx, { status: 'signed', rawSigned: signedTx })];
                        case 3:
                            e_6 = _a.sent();
                            throw toError(e_6);
                        case 4: return [2];
                    }
                });
            });
        };
        BaseTronPayments.prototype.broadcastTransaction = function (tx) {
            return __awaiter(this, void 0, void 0, function () {
                var status, success, result, e_7, statusCode, e_8;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 6, , 7]);
                            return [4, this.tronweb.trx.sendRawTransaction(tx.rawSigned)];
                        case 1:
                            status = _a.sent();
                            success = false;
                            if (!(status.result || status.code === 'SUCCESS')) return [3, 2];
                            success = true;
                            return [3, 5];
                        case 2:
                            _a.trys.push([2, 4, , 5]);
                            return [4, this.tronweb.trx.getTransaction(tx.id)];
                        case 3:
                            result = _a.sent();
                            success = true;
                            return [3, 5];
                        case 4:
                            e_7 = _a.sent();
                            return [3, 5];
                        case 5:
                            if (success) {
                                return [2, {
                                        id: tx.id
                                    }];
                            }
                            else {
                                statusCode = status.code;
                                if (status.code === 'DUP_TRANSACTION_ERROR') {
                                    statusCode = 'DUP_TX_BUT_TX_NOT_FOUND_SO_PROBABLY_INVALID_TX_ERROR';
                                }
                                throw new Error("Failed to broadcast transaction: " + status.code);
                            }
                            return [3, 7];
                        case 6:
                            e_8 = _a.sent();
                            throw toError(e_8);
                        case 7: return [2];
                    }
                });
            });
        };
        BaseTronPayments.prototype.getTransactionInfo = function (txid) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, tx, txInfo, currentBlock, _b, amountTrx, from, to, _c, fromIndex, toIndex, contractRet, isExecuted, block, feeTrx, currentBlockNumber, confirmations, isConfirmed, date, status, e_9;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _d.trys.push([0, 3, , 4]);
                            return [4, Promise.all([
                                    this.tronweb.trx.getTransaction(txid),
                                    this.tronweb.trx.getTransactionInfo(txid),
                                    this.tronweb.trx.getCurrentBlock(),
                                ])];
                        case 1:
                            _a = _d.sent(), tx = _a[0], txInfo = _a[1], currentBlock = _a[2];
                            _b = this.extractTxFields(tx), amountTrx = _b.amountTrx, from = _b.from, to = _b.to;
                            return [4, Promise.all([
                                    this.getAddressIndexOrNull(from),
                                    this.getAddressIndexOrNull(to),
                                ])];
                        case 2:
                            _c = _d.sent(), fromIndex = _c[0], toIndex = _c[1];
                            contractRet = lodash.get(tx, 'ret[0].contractRet');
                            isExecuted = contractRet === 'SUCCESS';
                            block = txInfo.blockNumber;
                            feeTrx = toMainDenomination(txInfo.fee || 0);
                            currentBlockNumber = lodash.get(currentBlock, 'block_header.raw_data.number', 0);
                            confirmations = currentBlockNumber && block ? currentBlockNumber - block : 0;
                            isConfirmed = confirmations > 0;
                            date = new Date(tx.raw_data.timestamp);
                            status = 'pending';
                            if (isConfirmed) {
                                if (!isExecuted) {
                                    status = 'failed';
                                }
                                status = 'confirmed';
                            }
                            return [2, {
                                    id: tx.txID,
                                    amount: amountTrx,
                                    to: to,
                                    from: from,
                                    toExtraId: null,
                                    fromIndex: fromIndex,
                                    toIndex: toIndex,
                                    block: block,
                                    fee: feeTrx,
                                    isExecuted: isExecuted,
                                    isConfirmed: isConfirmed,
                                    confirmations: confirmations,
                                    date: date,
                                    status: status,
                                    rawInfo: __assign({}, tx, txInfo, { currentBlock: lodash.pick(currentBlock, 'block_header', 'blockID') })
                                }];
                        case 3:
                            e_9 = _d.sent();
                            throw toError(e_9);
                        case 4: return [2];
                    }
                });
            });
        };
        BaseTronPayments.prototype.canSweepBalance = function (balanceSun) {
            return (balanceSun - TRX_FEE_FOR_TRANSFER_SUN) > 0;
        };
        BaseTronPayments.prototype.extractTxFields = function (tx) {
            var contractParam = lodash.get(tx, 'raw_data.contract[0].parameter.value');
            if (!(contractParam && typeof contractParam.amount === 'number')) {
                throw new Error('Unable to get transaction');
            }
            var amountSun = contractParam.amount || 0;
            var amountTrx = toMainDenomination(amountSun);
            var to = this.tronweb.address.fromHex(contractParam.to_address);
            var from = this.tronweb.address.fromHex(contractParam.owner_address);
            return {
                amountTrx: amountTrx,
                amountSun: amountSun,
                to: to,
                from: from,
            };
        };
        BaseTronPayments.prototype.resolveAddress = function (addressOrIndex) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    if (typeof addressOrIndex === 'number') {
                        return [2, this.getAddress(addressOrIndex)];
                    }
                    else {
                        if (!this.isValidAddress(addressOrIndex)) {
                            throw new Error("Invalid TRON address: " + addressOrIndex);
                        }
                        return [2, addressOrIndex];
                    }
                    return [2];
                });
            });
        };
        BaseTronPayments.prototype.resolveFromTo = function (from, to) {
            return __awaiter(this, void 0, void 0, function () {
                var fromIndex, _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            if (!(typeof from === 'string')) return [3, 2];
                            return [4, this.getAddressIndex(from)];
                        case 1:
                            _a = _d.sent();
                            return [3, 3];
                        case 2:
                            _a = from;
                            _d.label = 3;
                        case 3:
                            fromIndex = _a;
                            _b = {};
                            return [4, this.resolveAddress(from)];
                        case 4:
                            _b.fromAddress = _d.sent(),
                                _b.fromIndex = fromIndex;
                            return [4, this.getPrivateKey(fromIndex)];
                        case 5:
                            _b.fromPrivateKey = _d.sent();
                            return [4, this.resolveAddress(to)];
                        case 6:
                            _b.toAddress = _d.sent();
                            if (!(typeof to === 'string')) return [3, 8];
                            return [4, this.getAddressIndexOrNull(to)];
                        case 7:
                            _c = _d.sent();
                            return [3, 9];
                        case 8:
                            _c = to;
                            _d.label = 9;
                        case 9: return [2, (_b.toIndex = _c,
                                _b)];
                    }
                });
            });
        };
        BaseTronPayments.toMainDenomination = toMainDenomination;
        BaseTronPayments.toBaseDenomination = toBaseDenomination;
        return BaseTronPayments;
    }());

    var Bip44Cache = (function () {
        function Bip44Cache() {
            this.store = {};
        }
        Bip44Cache.prototype.put = function (xpub, index, address) {
            lodash.set(this.store, [xpub, 'addresses', index], address);
            lodash.set(this.store, [xpub, 'indices', address], index);
        };
        Bip44Cache.prototype.lookupIndex = function (xpub, address) {
            return lodash.get(this.store, [xpub, 'indices', address]);
        };
        Bip44Cache.prototype.lookupAddress = function (xpub, index) {
            return lodash.get(this.store, [xpub, 'addresses', index]);
        };
        return Bip44Cache;
    }());

    var ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    var ALPHABET_MAP = {};
    for (var i = 0; i < ALPHABET.length; i++) {
        ALPHABET_MAP[ALPHABET.charAt(i)] = i;
    }
    var BASE = 58;
    function encode58(buffer) {
        if (buffer.length === 0) {
            return '';
        }
        var i;
        var j;
        var digits = [0];
        for (i = 0; i < buffer.length; i++) {
            for (j = 0; j < digits.length; j++) {
                digits[j] <<= 8;
            }
            digits[0] += buffer[i];
            var carry = 0;
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
        return digits.reverse().map(function (digit) { return ALPHABET[digit]; }).join('');
    }
    function decode58(s) {
        if (s.length === 0) {
            return [];
        }
        var i;
        var j;
        var bytes = [0];
        for (i = 0; i < s.length; i++) {
            var c = s[i];
            if (!(c in ALPHABET_MAP)) {
                throw new Error('Non-base58 character');
            }
            for (j = 0; j < bytes.length; j++) {
                bytes[j] *= BASE;
            }
            bytes[0] += ALPHABET_MAP[c];
            var carry = 0;
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

    var ec = new elliptic.ec('secp256k1');
    var derivationPath = "m/44'/195'/0";
    var derivationPathParts = derivationPath.split('/').slice(1);
    function deriveAddress(xpub, index) {
        var key = new bitcoreLib.HDPublicKey(xpub);
        var derived = deriveBasePath(key).derive(index);
        return hdPublicKeyToAddress(derived);
    }
    function derivePrivateKey(xprv, index) {
        var key = new bitcoreLib.HDPrivateKey(xprv);
        var derived = deriveBasePath(key).derive(index);
        return hdPrivateKeyToPrivateKey(derived);
    }
    function xprvToXpub(xprv) {
        var key = xprv instanceof bitcoreLib.HDPrivateKey ? xprv : new bitcoreLib.HDPrivateKey(xprv);
        var derivedPubKey = deriveBasePath(key).hdPublicKey;
        return derivedPubKey.toString();
    }
    function deriveBasePath(key) {
        var parts = derivationPathParts.slice(key.depth);
        if (parts.length > 0) {
            return key.derive("m/" + parts.join('/'));
        }
        return key;
    }
    function hdPublicKeyToAddress(key) {
        return addressBytesToB58CheckAddress(pubBytesToTronBytes(bip32PublicToTronPublic(key.publicKey.toBuffer())));
    }
    function hdPrivateKeyToPrivateKey(key) {
        return bip32PrivateToTronPrivate(key.privateKey.toBuffer());
    }
    function bip32PublicToTronPublic(pubKey) {
        var pubkey = ec.keyFromPublic(pubKey).getPublic();
        var x = pubkey.x;
        var y = pubkey.y;
        var xHex = x.toString('hex');
        while (xHex.length < 64) {
            xHex = "0" + xHex;
        }
        var yHex = y.toString('hex');
        while (yHex.length < 64) {
            yHex = "0" + yHex;
        }
        var pubkeyHex = "04" + xHex + yHex;
        var pubkeyBytes = hexStr2byteArray(pubkeyHex);
        return pubkeyBytes;
    }
    function bip32PrivateToTronPrivate(priKeyBytes) {
        var key = ec.keyFromPrivate(priKeyBytes, 'bytes');
        var privkey = key.getPrivate();
        var priKeyHex = privkey.toString('hex');
        while (priKeyHex.length < 64) {
            priKeyHex = "0" + priKeyHex;
        }
        var privArray = hexStr2byteArray(priKeyHex);
        return byteArray2hexStr(privArray);
    }
    var ADDRESS_PREFIX = '41';
    function byte2hexStr(byte) {
        var hexByteMap = '0123456789ABCDEF';
        var str = '';
        str += hexByteMap.charAt(byte >> 4);
        str += hexByteMap.charAt(byte & 0x0f);
        return str;
    }
    function hexStr2byteArray(str) {
        var byteArray = Array();
        var d = 0;
        var j = 0;
        var k = 0;
        for (var i = 0; i < str.length; i++) {
            var c = str.charAt(i);
            if (isHexChar(c)) {
                d <<= 4;
                d += hexChar2byte(c);
                j++;
                if (0 === (j % 2)) {
                    byteArray[k++] = d;
                    d = 0;
                }
            }
        }
        return byteArray;
    }
    function isHexChar(c) {
        return ((c >= 'A' && c <= 'F') ||
            (c >= 'a' && c <= 'f') ||
            (c >= '0' && c <= '9'));
    }
    function hexChar2byte(c) {
        var d = 0;
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
        var str = '';
        for (var i = 0; i < (byteArray.length); i++) {
            str += byte2hexStr(byteArray[i]);
        }
        return str;
    }
    function pubBytesToTronBytes(pubBytes) {
        if (pubBytes.length === 65) {
            pubBytes = pubBytes.slice(1);
        }
        var hash = jsSha3.keccak256(pubBytes).toString();
        var addressHex = ADDRESS_PREFIX + hash.substring(24);
        return hexStr2byteArray(addressHex);
    }
    function addressBytesToB58CheckAddress(addressBytes) {
        var hash0 = SHA256(addressBytes);
        var hash1 = SHA256(hash0);
        var checkSum = hash1.slice(0, 4);
        checkSum = addressBytes.concat(checkSum);
        return encode58(checkSum);
    }
    function SHA256(msgBytes) {
        var shaObj = new jsSHA('SHA-256', 'HEX');
        var msgHex = byteArray2hexStr(msgBytes);
        shaObj.update(msgHex);
        var hashHex = shaObj.getHash('HEX');
        return hexStr2byteArray(hashHex);
    }

    var xpubCache = new Bip44Cache();
    var HdTronPayments = (function (_super) {
        __extends(HdTronPayments, _super);
        function HdTronPayments(config) {
            var _this = _super.call(this, config) || this;
            _this.hdKey = config.hdKey;
            _this.maxAddressScan = config.maxAddressScan || DEFAULT_MAX_ADDRESS_SCAN;
            if (!(isValidXprv(_this.hdKey) || isValidXpub(_this.hdKey))) {
                throw new Error('Account must be a valid xprv or xpub');
            }
            return _this;
        }
        HdTronPayments.generateNewKeys = function () {
            var key = new bitcoreLib.HDPrivateKey();
            var xprv = key.toString();
            var xpub = xprvToXpub(xprv);
            return {
                xprv: xprv,
                xpub: xpub,
            };
        };
        HdTronPayments.prototype.getXpub = function () {
            return isValidXprv(this.hdKey)
                ? xprvToXpub(this.hdKey)
                : this.hdKey;
        };
        HdTronPayments.prototype.getAddress = function (index, options) {
            if (options === void 0) { options = {}; }
            return __awaiter(this, void 0, void 0, function () {
                var cacheIndex, xpub, address;
                return __generator(this, function (_a) {
                    cacheIndex = options.cacheIndex || true;
                    xpub = this.getXpub();
                    address = deriveAddress(xpub, index);
                    if (!this.isValidAddress(address)) {
                        throw new Error("Cannot get address " + index + " - validation failed");
                    }
                    if (cacheIndex) {
                        xpubCache.put(xpub, index, address);
                    }
                    return [2, address];
                });
            });
        };
        HdTronPayments.prototype.getAddressIndex = function (address) {
            return __awaiter(this, void 0, void 0, function () {
                var xpub, cachedIndex, i;
                return __generator(this, function (_a) {
                    xpub = this.getXpub();
                    cachedIndex = xpubCache.lookupIndex(xpub, address);
                    if (cachedIndex) {
                        return [2, cachedIndex];
                    }
                    for (i = 0; i < this.maxAddressScan; i++) {
                        if (address === deriveAddress(xpub, i)) {
                            xpubCache.put(xpub, i, address);
                            return [2, i];
                        }
                    }
                    throw new Error('Cannot get index of address after checking cache and scanning addresses'
                        + (" from 0 to " + (this.maxAddressScan - 1) + " (address=" + address + ")"));
                });
            });
        };
        HdTronPayments.prototype.getPrivateKey = function (index) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    if (!isValidXprv(this.hdKey)) {
                        throw new Error("Cannot get private key " + index + " - account is not a valid xprv)");
                    }
                    return [2, derivePrivateKey(this.hdKey, index)];
                });
            });
        };
        return HdTronPayments;
    }(BaseTronPayments));

    var KeyPairTronPayments = (function (_super) {
        __extends(KeyPairTronPayments, _super);
        function KeyPairTronPayments(config) {
            var _this = _super.call(this, config) || this;
            _this.addresses = {};
            _this.privateKeys = {};
            _this.addressIndices = {};
            Object.entries(config.keyPairs).forEach(function (_a) {
                var iString = _a[0], addressOrKey = _a[1];
                if (typeof addressOrKey === 'undefined' || addressOrKey === null) {
                    return;
                }
                var i = Number.parseInt(iString);
                if (_this.isValidAddress(addressOrKey)) {
                    _this.addresses[i] = addressOrKey;
                    _this.privateKeys[i] = null;
                    _this.addressIndices[addressOrKey] = i;
                    return;
                }
                if (_this.isValidPrivateKey(addressOrKey)) {
                    var address = _this.privateKeyToAddress(addressOrKey);
                    _this.addresses[i] = address;
                    _this.privateKeys[i] = addressOrKey;
                    _this.addressIndices[address] = i;
                    return;
                }
                throw new Error("keyPairs[" + i + "] is not a valid private key or address");
            });
            return _this;
        }
        KeyPairTronPayments.prototype.getAddress = function (index) {
            return __awaiter(this, void 0, void 0, function () {
                var address;
                return __generator(this, function (_a) {
                    address = this.addresses[index];
                    if (typeof address === 'undefined') {
                        throw new Error("Cannot get address " + index + " - keyPair[" + index + "] is undefined");
                    }
                    return [2, address];
                });
            });
        };
        KeyPairTronPayments.prototype.getAddressIndex = function (address) {
            return __awaiter(this, void 0, void 0, function () {
                var index;
                return __generator(this, function (_a) {
                    index = this.addressIndices[address];
                    if (typeof index === 'undefined') {
                        throw new Error("Cannot get index of address " + address);
                    }
                    return [2, index];
                });
            });
        };
        KeyPairTronPayments.prototype.getPrivateKey = function (index) {
            return __awaiter(this, void 0, void 0, function () {
                var privateKey;
                return __generator(this, function (_a) {
                    privateKey = this.privateKeys[index];
                    if (typeof privateKey === 'undefined') {
                        throw new Error("Cannot get private key " + index + " - keyPair[" + index + "] is undefined");
                    }
                    if (privateKey === null) {
                        throw new Error("Cannot get private key " + index + " - keyPair[" + index + "] is a public address");
                    }
                    return [2, privateKey];
                });
            });
        };
        return KeyPairTronPayments;
    }(BaseTronPayments));

    var TronPaymentsFactory = (function () {
        function TronPaymentsFactory() {
        }
        TronPaymentsFactory.prototype.forConfig = function (config) {
            if (config.hdKey) {
                return new HdTronPayments(config);
            }
            if (config.keyPairs) {
                return new KeyPairTronPayments(config);
            }
            throw new Error('Cannot instantiate tron payments for unsupported config');
        };
        return TronPaymentsFactory;
    }());

    exports.BaseTronPayments = BaseTronPayments;
    exports.HdTronPayments = HdTronPayments;
    exports.KeyPairTronPayments = KeyPairTronPayments;
    exports.TronPaymentsFactory = TronPaymentsFactory;
    exports.toError = toError;
    exports.toMainDenominationNumber = toMainDenominationNumber;
    exports.toMainDenomination = toMainDenomination;
    exports.toBaseDenominationNumber = toBaseDenominationNumber;
    exports.toBaseDenomination = toBaseDenomination;
    exports.isValidXprv = isValidXprv;
    exports.isValidXpub = isValidXpub;
    exports.derivationPath = derivationPath;
    exports.deriveAddress = deriveAddress;
    exports.derivePrivateKey = derivePrivateKey;
    exports.xprvToXpub = xprvToXpub;
    exports.encode58 = encode58;
    exports.decode58 = decode58;
    exports.TRX_FEE_FOR_TRANSFER = TRX_FEE_FOR_TRANSFER;
    exports.TRX_FEE_FOR_TRANSFER_SUN = TRX_FEE_FOR_TRANSFER_SUN;
    exports.DEFAULT_FULL_NODE = DEFAULT_FULL_NODE;
    exports.DEFAULT_SOLIDITY_NODE = DEFAULT_SOLIDITY_NODE;
    exports.DEFAULT_EVENT_SERVER = DEFAULT_EVENT_SERVER;
    exports.DEFAULT_MAX_ADDRESS_SCAN = DEFAULT_MAX_ADDRESS_SCAN;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=index.umd.js.map
