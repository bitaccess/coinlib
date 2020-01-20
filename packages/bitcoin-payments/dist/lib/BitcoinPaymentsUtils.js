import { BitcoinishPaymentsUtils } from './bitcoinish';
import { toBitcoinishConfig } from './utils';
import { isValidAddress, isValidPrivateKey } from './helpers';
export class BitcoinPaymentsUtils extends BitcoinishPaymentsUtils {
    constructor(config = {}) {
        super(toBitcoinishConfig(config));
    }
    async isValidAddress(address) {
        return isValidAddress(address, this.bitcoinjsNetwork);
    }
    async isValidPrivateKey(privateKey) {
        return isValidPrivateKey(privateKey, this.bitcoinjsNetwork);
    }
}
//# sourceMappingURL=BitcoinPaymentsUtils.js.map