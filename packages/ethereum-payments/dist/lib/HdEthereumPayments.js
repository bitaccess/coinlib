import { BaseEthereumPayments } from './BaseEthereumPayments';
import { deriveSignatory } from './bip44';
import { omit } from 'lodash';
export class HdEthereumPayments extends BaseEthereumPayments {
    constructor(config) {
        super(config);
        try {
            this.xprv = '';
            this.xpub = '';
            if (this.isValidXpub(config.hdKey)) {
                this.xpub = config.hdKey;
            }
            else if (this.isValidXprv(config.hdKey)) {
                this.xprv = config.hdKey;
                this.xpub = deriveSignatory(config.hdKey, 0).xkeys.xpub;
            }
        }
        catch (e) {
            throw new Error(`Account must be a valid xprv or xpub: ${e.message}`);
        }
    }
    static generateNewKeys() {
        return deriveSignatory();
    }
    getXpub() {
        return this.xpub;
    }
    getPublicConfig() {
        return {
            ...omit(this.getFullConfig(), ['hdKey', 'logger', 'fullNode', 'solidityNode', 'eventServer']),
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
        const { address } = deriveSignatory(this.getXpub(), index);
        if (!await this.isValidAddress(address)) {
            throw new Error(`Cannot get address ${index} - validation failed for derived address`);
        }
        return { address };
    }
    async getPrivateKey(index) {
        if (!this.xprv) {
            throw new Error(`Cannot get private key ${index} - HdEthereumPayments was created with an xpub`);
        }
        return deriveSignatory(deriveSignatory(this.xprv, 0).xkeys.xprv, index).keys.prv;
    }
}
export default HdEthereumPayments;
//# sourceMappingURL=HdEthereumPayments.js.map