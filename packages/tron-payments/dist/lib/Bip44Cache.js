import { set, get } from 'lodash';
var Bip44Cache = (function () {
    function Bip44Cache() {
        this.store = {};
    }
    Bip44Cache.prototype.put = function (xpub, index, address) {
        set(this.store, [xpub, 'addresses', index], address);
        set(this.store, [xpub, 'indices', address], index);
    };
    Bip44Cache.prototype.lookupIndex = function (xpub, address) {
        return get(this.store, [xpub, 'indices', address]);
    };
    Bip44Cache.prototype.lookupAddress = function (xpub, index) {
        return get(this.store, [xpub, 'addresses', index]);
    };
    return Bip44Cache;
}());
export default Bip44Cache;
//# sourceMappingURL=Bip44Cache.js.map