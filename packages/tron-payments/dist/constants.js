"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _a;
var payments_common_1 = require("@faast/payments-common");
exports.FEE_FOR_TRANSFER_SUN = 100000;
exports.FEE_LEVEL_TRANSFER_SUN = (_a = {},
    _a[payments_common_1.FeeLevel.Low] = exports.FEE_FOR_TRANSFER_SUN,
    _a[payments_common_1.FeeLevel.Medium] = exports.FEE_FOR_TRANSFER_SUN,
    _a[payments_common_1.FeeLevel.High] = exports.FEE_FOR_TRANSFER_SUN,
    _a);
exports.DEFAULT_FULL_NODE = process.env.TRX_FULL_NODE_URL || 'http://54.236.37.243:8090';
exports.DEFAULT_SOLIDITY_NODE = process.env.TRX_SOLIDITY_NODE_URL || 'http://47.89.187.247:8091';
exports.DEFAULT_EVENT_SERVER = process.env.TRX_EVENT_SERVER_URL || 'https://api.trongrid.io';
exports.DEFAULT_MAX_ADDRESS_SCAN = 10;
//# sourceMappingURL=constants.js.map