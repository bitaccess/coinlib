"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var lodash_1 = require("lodash");
var Bip44Cache = (function () {
    function Bip44Cache() {
        this.store = {};
    }
    Bip44Cache.prototype.put = function (xpub, index, address) {
        lodash_1.set(this.store, [xpub, 'addresses', index], address);
        lodash_1.set(this.store, [xpub, 'indices', address], index);
    };
    Bip44Cache.prototype.lookupIndex = function (xpub, address) {
        return lodash_1.get(this.store, [xpub, 'indices', address]);
    };
    Bip44Cache.prototype.lookupAddress = function (xpub, index) {
        return lodash_1.get(this.store, [xpub, 'addresses', index]);
    };
    return Bip44Cache;
}());
exports.Bip44Cache = Bip44Cache;
exports.default = Bip44Cache;
//# sourceMappingURL=Bip44Cache.js.map