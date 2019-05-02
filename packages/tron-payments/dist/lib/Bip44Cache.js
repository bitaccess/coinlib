import { set, get } from 'lodash';
export class Bip44Cache {
    constructor() {
        this.store = {};
    }
    put(xpub, index, address) {
        set(this.store, [xpub, 'addresses', index], address);
        set(this.store, [xpub, 'indices', address], index);
    }
    lookupIndex(xpub, address) {
        return get(this.store, [xpub, 'indices', address]);
    }
    lookupAddress(xpub, index) {
        return get(this.store, [xpub, 'addresses', index]);
    }
}
export default Bip44Cache;
//# sourceMappingURL=Bip44Cache.js.map