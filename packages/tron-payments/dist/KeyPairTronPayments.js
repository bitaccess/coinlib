"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
Object.defineProperty(exports, "__esModule", { value: true });
var BaseTronPayments_1 = require("./BaseTronPayments");
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
}(BaseTronPayments_1.BaseTronPayments));
exports.KeyPairTronPayments = KeyPairTronPayments;
exports.default = KeyPairTronPayments;
//# sourceMappingURL=KeyPairTronPayments.js.map