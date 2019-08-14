import { BaseConfig, NetworkType } from '@faast/payments-common';
import { toMainDenominationString, toBaseDenominationString, isValidXprv, isValidXpub, isValidAddress, isValidExtraId, isValidPayport, isValidPrivateKey, privateKeyToAddress, } from './helpers';
import { DelegateLogger, assertType } from '@faast/ts-common';
import { PACKAGE_NAME } from './constants';
export class TronPaymentsUtils {
    constructor(config = {}) {
        this.isValidXprv = isValidXprv;
        this.isValidXpub = isValidXpub;
        this.isValidPrivateKey = isValidPrivateKey;
        this.privateKeyToAddress = privateKeyToAddress;
        assertType(BaseConfig, config);
        this.networkType = config.network || NetworkType.Mainnet;
        this.logger = new DelegateLogger(config.logger, PACKAGE_NAME);
    }
    async isValidExtraId(extraId) {
        return isValidExtraId(extraId);
    }
    async isValidAddress(address) {
        return isValidAddress(address);
    }
    async isValidPayport(payport) {
        return isValidPayport(payport);
    }
    toMainDenomination(amount) {
        return toMainDenominationString(amount);
    }
    toBaseDenomination(amount) {
        return toBaseDenominationString(amount);
    }
}
//# sourceMappingURL=TronPaymentsUtils.js.map