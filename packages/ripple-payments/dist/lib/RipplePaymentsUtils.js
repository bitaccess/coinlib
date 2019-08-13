import { BaseConfig, NetworkType, Payport } from '@faast/payments-common';
import { toMainDenominationString, toBaseDenominationString, isValidXprv, isValidXpub, isValidAddress, isValidExtraId, } from './helpers';
import { DelegateLogger, isNil, assertType } from '@faast/ts-common';
import { PACKAGE_NAME } from './constants';
export class RipplePaymentsUtils {
    constructor(config = {}) {
        this.isValidXprv = isValidXprv;
        this.isValidXpub = isValidXpub;
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
        if (!Payport.is(payport)) {
            return false;
        }
        const { address, extraId } = payport;
        return (await this.isValidAddress(address)) && (isNil(extraId) ? true : this.isValidExtraId(extraId));
    }
    toMainDenomination(amount) {
        return toMainDenominationString(amount);
    }
    toBaseDenomination(amount) {
        return toBaseDenominationString(amount);
    }
}
//# sourceMappingURL=RipplePaymentsUtils.js.map