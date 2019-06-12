import { HDPrivateKey } from 'bitcore-lib';
import { BaseTronPayments } from './BaseTronPayments';
import Bip44Cache from './Bip44Cache';
import { deriveAddress, derivePrivateKey, xprvToXpub } from './bip44';
import { DEFAULT_MAX_ADDRESS_SCAN } from './constants';
import { isValidXpub, isValidXprv, isValidAddress } from './utils';
const xpubCache = new Bip44Cache();
export class HdTronPayments extends BaseTronPayments {
    constructor(config) {
        super(config);
        this.config = config;
        this.maxAddressScan = config.maxAddressScan || DEFAULT_MAX_ADDRESS_SCAN;
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
    static generateNewKeys() {
        const key = new HDPrivateKey();
        const xprv = key.toString();
        const xpub = xprvToXpub(xprv);
        return {
            xprv,
            xpub,
        };
    }
    getXpub() {
        return this.xpub;
    }
    getFullConfig() {
        return this.config;
    }
    getPublicConfig() {
        return {
            ...this.config,
            hdKey: this.getXpub(),
        };
    }
    getAccountId(index) {
        return this.getXpub();
    }
    getAccountIds() {
        return [this.getXpub()];
    }
    async getAddress(index, options = {}) {
        const cacheIndex = options.cacheIndex || true;
        const xpub = this.getXpub();
        const address = deriveAddress(xpub, index);
        if (!isValidAddress(address)) {
            throw new Error(`Cannot get address ${index} - validation failed for derived address`);
        }
        if (cacheIndex) {
            xpubCache.put(xpub, index, address);
        }
        return address;
    }
    async getAddressIndex(address) {
        const xpub = this.getXpub();
        const cachedIndex = xpubCache.lookupIndex(xpub, address);
        if (cachedIndex) {
            return cachedIndex;
        }
        for (let i = 0; i < this.maxAddressScan; i++) {
            if (address === deriveAddress(xpub, i)) {
                xpubCache.put(xpub, i, address);
                return i;
            }
        }
        throw new Error('Cannot get index of address after checking cache and scanning addresses' +
            ` from 0 to ${this.maxAddressScan - 1} (address=${address})`);
    }
    async getPrivateKey(index) {
        if (!this.xprv) {
            throw new Error(`Cannot get private key ${index} - HdTronPayments was created with an xpub`);
        }
        return derivePrivateKey(this.xprv, index);
    }
}
export default HdTronPayments;
//# sourceMappingURL=HdTronPayments.js.map