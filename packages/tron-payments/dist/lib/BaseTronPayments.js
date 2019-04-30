var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
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
};
import TronWeb from 'tronweb';
import { pick, get, cloneDeep } from 'lodash';
import { TransactionStatus, FeeLevel, FeeRateType, FeeOptionCustom, } from '@faast/payments-common';
import { isType } from '@faast/ts-common';
import { toMainDenomination, toBaseDenomination, toBaseDenominationNumber, toError } from './utils';
import { FEE_LEVEL_TRANSFER_SUN, DEFAULT_FULL_NODE, DEFAULT_EVENT_SERVER, DEFAULT_SOLIDITY_NODE, FEE_FOR_TRANSFER_SUN, } from './constants';
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
    BaseTronPayments.prototype.resolveFeeOption = function (feeOption) {
        return __awaiter(this, void 0, void 0, function () {
            var targetFeeLevel, targetFeeRate, targetFeeRateType, feeBase, feeMain;
            return __generator(this, function (_a) {
                if (isType(FeeOptionCustom, feeOption)) {
                    targetFeeLevel = FeeLevel.Custom;
                    targetFeeRate = feeOption.feeRate;
                    targetFeeRateType = feeOption.feeRateType;
                    if (feeOption.feeRateType === FeeRateType.Base) {
                        feeBase = feeOption.feeRate;
                    }
                    else if (feeOption.feeRateType === FeeRateType.Main) {
                        feeBase = toBaseDenomination(feeOption.feeRate);
                    }
                    else {
                        throw new Error("Unsupported feeRateType for TRX: " + feeOption.feeRateType);
                    }
                }
                else {
                    feeBase = FEE_LEVEL_TRANSFER_SUN[feeOption.feeLevel].toString();
                    targetFeeLevel = feeOption.feeLevel;
                    targetFeeRate = feeBase;
                    targetFeeRateType = FeeRateType.Base;
                }
                feeMain = toMainDenomination(feeBase);
                return [2, {
                        targetFeeLevel: targetFeeLevel,
                        targetFeeRate: targetFeeRate,
                        targetFeeRateType: targetFeeRateType,
                        feeBase: feeBase,
                        feeMain: feeMain,
                    }];
            });
        });
    };
    BaseTronPayments.prototype.createSweepTransaction = function (from, to, options) {
        if (options === void 0) { options = { feeLevel: FeeLevel.Medium }; }
        return __awaiter(this, void 0, void 0, function () {
            var _a, fromAddress, fromIndex, toAddress, toIndex, _b, targetFeeLevel, targetFeeRate, targetFeeRateType, feeBase, feeMain, feeSun, balanceSun, balanceTrx, amountSun, amountTrx, tx, e_4;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 5, , 6]);
                        return [4, this.resolveFromTo(from, to)];
                    case 1:
                        _a = _c.sent(), fromAddress = _a.fromAddress, fromIndex = _a.fromIndex, toAddress = _a.toAddress, toIndex = _a.toIndex;
                        return [4, this.resolveFeeOption(options)];
                    case 2:
                        _b = _c.sent(), targetFeeLevel = _b.targetFeeLevel, targetFeeRate = _b.targetFeeRate, targetFeeRateType = _b.targetFeeRateType, feeBase = _b.feeBase, feeMain = _b.feeMain;
                        feeSun = Number.parseInt(feeBase);
                        return [4, this.tronweb.trx.getBalance(fromAddress)];
                    case 3:
                        balanceSun = _c.sent();
                        balanceTrx = toMainDenomination(balanceSun);
                        if (!this.canSweepBalance(balanceSun)) {
                            throw new Error("Insufficient balance (" + balanceTrx + ") to sweep with fee of " + feeMain);
                        }
                        amountSun = balanceSun - feeSun;
                        amountTrx = toMainDenomination(amountSun);
                        return [4, this.tronweb.transactionBuilder.sendTrx(toAddress, amountSun, fromAddress)];
                    case 4:
                        tx = _c.sent();
                        return [2, {
                                id: tx.txID,
                                fromAddress: fromAddress,
                                toAddress: toAddress,
                                toExtraId: null,
                                fromIndex: fromIndex,
                                toIndex: toIndex,
                                amount: amountTrx,
                                fee: feeMain,
                                targetFeeLevel: targetFeeLevel,
                                targetFeeRate: targetFeeRate,
                                targetFeeRateType: targetFeeRateType,
                                status: 'unsigned',
                                data: tx,
                            }];
                    case 5:
                        e_4 = _c.sent();
                        throw toError(e_4);
                    case 6: return [2];
                }
            });
        });
    };
    BaseTronPayments.prototype.createTransaction = function (from, to, amountTrx, options) {
        if (options === void 0) { options = { feeLevel: FeeLevel.Medium }; }
        return __awaiter(this, void 0, void 0, function () {
            var _a, fromAddress, fromIndex, toAddress, toIndex, _b, targetFeeLevel, targetFeeRate, targetFeeRateType, feeBase, feeMain, feeSun, balanceSun, balanceTrx, amountSun, tx, e_5;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 5, , 6]);
                        return [4, this.resolveFromTo(from, to)];
                    case 1:
                        _a = _c.sent(), fromAddress = _a.fromAddress, fromIndex = _a.fromIndex, toAddress = _a.toAddress, toIndex = _a.toIndex;
                        return [4, this.resolveFeeOption(options)];
                    case 2:
                        _b = _c.sent(), targetFeeLevel = _b.targetFeeLevel, targetFeeRate = _b.targetFeeRate, targetFeeRateType = _b.targetFeeRateType, feeBase = _b.feeBase, feeMain = _b.feeMain;
                        feeSun = Number.parseInt(feeBase);
                        return [4, this.tronweb.trx.getBalance(fromAddress)];
                    case 3:
                        balanceSun = _c.sent();
                        balanceTrx = toMainDenomination(balanceSun);
                        amountSun = toBaseDenominationNumber(amountTrx);
                        if (balanceSun - feeSun < amountSun) {
                            throw new Error("Insufficient balance (" + balanceTrx + ") to send including fee of " + feeMain);
                        }
                        return [4, this.tronweb.transactionBuilder.sendTrx(toAddress, amountSun, fromAddress)];
                    case 4:
                        tx = _c.sent();
                        return [2, {
                                id: tx.txID,
                                fromAddress: fromAddress,
                                toAddress: toAddress,
                                toExtraId: null,
                                fromIndex: fromIndex,
                                toIndex: toIndex,
                                amount: amountTrx,
                                fee: feeMain,
                                targetFeeLevel: targetFeeLevel,
                                targetFeeRate: targetFeeRate,
                                targetFeeRateType: targetFeeRateType,
                                status: 'unsigned',
                                data: tx,
                            }];
                    case 5:
                        e_5 = _c.sent();
                        throw toError(e_5);
                    case 6: return [2];
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
                        unsignedRaw = cloneDeep(unsignedTx.data);
                        return [4, this.tronweb.trx.sign(unsignedRaw, fromPrivateKey)];
                    case 2:
                        signedTx = _a.sent();
                        return [2, __assign({}, unsignedTx, { status: 'signed', data: signedTx })];
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
            var status, success, rebroadcast, e_7, statusCode, e_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        return [4, this.tronweb.trx.sendRawTransaction(tx.data)];
                    case 1:
                        status = _a.sent();
                        success = false;
                        rebroadcast = false;
                        if (!(status.result || status.code === 'SUCCESS')) return [3, 2];
                        success = true;
                        return [3, 5];
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4, this.tronweb.trx.getTransaction(tx.id)];
                    case 3:
                        _a.sent();
                        success = true;
                        rebroadcast = true;
                        return [3, 5];
                    case 4:
                        e_7 = _a.sent();
                        return [3, 5];
                    case 5:
                        if (success) {
                            return [2, {
                                    id: tx.id,
                                    rebroadcast: rebroadcast,
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
            var _a, tx, txInfo, currentBlock, _b, amountTrx, fromAddress, toAddress, _c, fromIndex, toIndex, contractRet, isExecuted, block, feeTrx, currentBlockNumber, confirmations, isConfirmed, date, status, e_9;
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
                        _b = this.extractTxFields(tx), amountTrx = _b.amountTrx, fromAddress = _b.fromAddress, toAddress = _b.toAddress;
                        return [4, Promise.all([
                                this.getAddressIndexOrNull(fromAddress),
                                this.getAddressIndexOrNull(toAddress),
                            ])];
                    case 2:
                        _c = _d.sent(), fromIndex = _c[0], toIndex = _c[1];
                        contractRet = get(tx, 'ret[0].contractRet');
                        isExecuted = contractRet === 'SUCCESS';
                        block = txInfo.blockNumber;
                        feeTrx = toMainDenomination(txInfo.fee || 0);
                        currentBlockNumber = get(currentBlock, 'block_header.raw_data.number', 0);
                        confirmations = currentBlockNumber && block ? currentBlockNumber - block : 0;
                        isConfirmed = confirmations > 0;
                        date = new Date(tx.raw_data.timestamp);
                        status = TransactionStatus.Pending;
                        if (isConfirmed) {
                            if (!isExecuted) {
                                status = TransactionStatus.Failed;
                            }
                            status = TransactionStatus.Confirmed;
                        }
                        return [2, {
                                id: tx.txID,
                                amount: amountTrx,
                                toAddress: toAddress,
                                fromAddress: fromAddress,
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
                                data: __assign({}, tx, txInfo, { currentBlock: pick(currentBlock, 'block_header', 'blockID') }),
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
        return balanceSun - FEE_FOR_TRANSFER_SUN > 0;
    };
    BaseTronPayments.prototype.extractTxFields = function (tx) {
        var contractParam = get(tx, 'raw_data.contract[0].parameter.value');
        if (!(contractParam && typeof contractParam.amount === 'number')) {
            throw new Error('Unable to get transaction');
        }
        var amountSun = contractParam.amount || 0;
        var amountTrx = toMainDenomination(amountSun);
        var toAddress = this.tronweb.address.fromHex(contractParam.to_address);
        var fromAddress = this.tronweb.address.fromHex(contractParam.owner_address);
        return {
            amountTrx: amountTrx,
            amountSun: amountSun,
            toAddress: toAddress,
            fromAddress: fromAddress,
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
                        return [4, this.resolveAddress(to)];
                    case 5:
                        _b.toAddress = _d.sent();
                        if (!(typeof to === 'string')) return [3, 7];
                        return [4, this.getAddressIndexOrNull(to)];
                    case 6:
                        _c = _d.sent();
                        return [3, 8];
                    case 7:
                        _c = to;
                        _d.label = 8;
                    case 8: return [2, (_b.toIndex = _c,
                            _b)];
                }
            });
        });
    };
    BaseTronPayments.toMainDenomination = toMainDenomination;
    BaseTronPayments.toBaseDenomination = toBaseDenomination;
    return BaseTronPayments;
}());
export { BaseTronPayments };
export default BaseTronPayments;
//# sourceMappingURL=BaseTronPayments.js.map