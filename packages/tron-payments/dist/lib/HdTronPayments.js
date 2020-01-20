import { BaseTronPayments } from './BaseTronPayments';
import { deriveAddress, derivePrivateKey, xprvToXpub, generateNewKeys } from './bip44';
import { isValidXprv, isValidXpub, isValidAddress } from './helpers';
import { omit } from 'lodash';
export class HdTronPayments extends BaseTronPayments {
    constructor(config) {
        super(config);
        this.config = config;
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
    getXpub() {
        return this.xpub;
    }
    getFullConfig() {
        return this.config;
    }
    getPublicConfig() {
        return {
            ...omit(this.config, ['logger', 'fullNode', 'solidityNode', 'eventServer', 'hdKey']),
            hdKey: this.getXpub(),
        };
    }
    getAccountId(index) {
        return this.getXpub();
    }
    getAccountIds() {
        return [this.getXpub()];
    }
    async getPayport(index) {
        const xpub = this.getXpub();
        const address = deriveAddress(xpub, index);
        if (!isValidAddress(address)) {
            throw new Error(`Cannot get address ${index} - validation failed for derived address`);
        }
        return { address };
    }
    async getPrivateKey(index) {
        if (!this.xprv) {
            throw new Error(`Cannot get private key ${index} - HdTronPayments was created with an xpub`);
        }
        return derivePrivateKey(this.xprv, index);
    }
}
HdTronPayments.generateNewKeys = generateNewKeys;
export default HdTronPayments;
//# sourceMappingURL=HdTronPayments.js.map