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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var bitcore_lib_1 = require("bitcore-lib");
var BaseTronPayments_1 = require("./BaseTronPayments");
var Bip44Cache_1 = __importDefault(require("./Bip44Cache"));
var bip44_1 = require("./bip44");
var constants_1 = require("./constants");
var utils_1 = require("./utils");
var xpubCache = new Bip44Cache_1.default();
var HdTronPayments = (function (_super) {
    __extends(HdTronPayments, _super);
    function HdTronPayments(config) {
        var _this = _super.call(this, config) || this;
        _this.hdKey = config.hdKey;
        _this.maxAddressScan = config.maxAddressScan || constants_1.DEFAULT_MAX_ADDRESS_SCAN;
        if (!(utils_1.isValidXprv(_this.hdKey) || utils_1.isValidXpub(_this.hdKey))) {
            throw new Error('Account must be a valid xprv or xpub');
        }
        return _this;
    }
    HdTronPayments.generateNewKeys = function () {
        var key = new bitcore_lib_1.HDPrivateKey();
        var xprv = key.toString();
        var xpub = bip44_1.xprvToXpub(xprv);
        return {
            xprv: xprv,
            xpub: xpub,
        };
    };
    HdTronPayments.prototype.getXpub = function () {
        return utils_1.isValidXprv(this.hdKey) ? bip44_1.xprvToXpub(this.hdKey) : this.hdKey;
    };
    HdTronPayments.prototype.getAddress = function (index, options) {
        if (options === void 0) { options = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var cacheIndex, xpub, address;
            return __generator(this, function (_a) {
                cacheIndex = options.cacheIndex || true;
                xpub = this.getXpub();
                address = bip44_1.deriveAddress(xpub, index);
                if (!this.isValidAddress(address)) {
                    throw new Error("Cannot get address " + index + " - validation failed for derived address");
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
                    if (address === bip44_1.deriveAddress(xpub, i)) {
                        xpubCache.put(xpub, i, address);
                        return [2, i];
                    }
                }
                throw new Error('Cannot get index of address after checking cache and scanning addresses' +
                    (" from 0 to " + (this.maxAddressScan - 1) + " (address=" + address + ")"));
            });
        });
    };
    HdTronPayments.prototype.getPrivateKey = function (index) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (!utils_1.isValidXprv(this.hdKey)) {
                    throw new Error("Cannot get private key " + index + " - account is not a valid xprv)");
                }
                return [2, bip44_1.derivePrivateKey(this.hdKey, index)];
            });
        });
    };
    return HdTronPayments;
}(BaseTronPayments_1.BaseTronPayments));
exports.HdTronPayments = HdTronPayments;
exports.default = HdTronPayments;
//# sourceMappingURL=HdTronPayments.js.map