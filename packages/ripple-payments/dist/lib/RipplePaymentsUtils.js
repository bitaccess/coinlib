import { Payport } from '@faast/payments-common';
import { isNil, assertType } from '@faast/ts-common';
import { toMainDenominationString, toBaseDenominationString, isValidXprv, isValidXpub, isValidAddress, isValidExtraId, } from './helpers';
import { RippleConnected } from './RippleConnected';
export class RipplePaymentsUtils extends RippleConnected {
    constructor(config) {
        super(config);
        this.isValidXprv = isValidXprv;
        this.isValidXpub = isValidXpub;
    }
    async isValidExtraId(extraId) {
        return isValidExtraId(extraId);
    }
    async isValidAddress(address) {
        return isValidAddress(address);
    }
    async getPayportValidationMessage(payport) {
        const { address, extraId } = payport;
        if (!(await this.isValidAddress(address))) {
            return 'Invalid payport address';
        }
        let requireExtraId = false;
        try {
            const settings = await this._retryDced(() => this.api.getSettings(address));
            requireExtraId = settings.requireDestinationTag || false;
        }
        catch (e) {
            this.logger.debug(`Failed to retrieve settings for ${address} - ${e.message}`);
        }
        if (isNil(extraId)) {
            if (requireExtraId) {
                return `Payport extraId is required for address ${address} with ripple requireDestinationTag setting enabled`;
            }
        }
        else if (!(await this.isValidExtraId(extraId))) {
            return 'Invalid payport extraId';
        }
    }
    async validatePayport(payport) {
        assertType(Payport, payport);
        const message = await this.getPayportValidationMessage(payport);
        if (message) {
            throw new Error(message);
        }
    }
    async isValidPayport(payport) {
        if (!Payport.is(payport)) {
            return false;
        }
        return !(await this.getPayportValidationMessage(payport));
    }
    toMainDenomination(amount) {
        return toMainDenominationString(amount);
    }
    toBaseDenomination(amount) {
        return toBaseDenominationString(amount);
    }
}
//# sourceMappingURL=RipplePaymentsUtils.js.map