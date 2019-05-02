"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var HdTronPayments_1 = require("./HdTronPayments");
var KeyPairTronPayments_1 = require("./KeyPairTronPayments");
var TronPaymentsFactory = (function () {
    function TronPaymentsFactory() {
    }
    TronPaymentsFactory.prototype.forConfig = function (config) {
        if (config.hdKey) {
            return new HdTronPayments_1.HdTronPayments(config);
        }
        if (config.keyPairs) {
            return new KeyPairTronPayments_1.KeyPairTronPayments(config);
        }
        throw new Error('Cannot instantiate tron payments for unsupported config');
    };
    return TronPaymentsFactory;
}());
exports.TronPaymentsFactory = TronPaymentsFactory;
exports.default = TronPaymentsFactory;
//# sourceMappingURL=TronPaymentsFactory.js.map