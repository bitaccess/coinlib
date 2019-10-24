import { Payport } from '@faast/payments-common';
import { toMainDenominationString, toBaseDenominationString, isValidAddress, isValidExtraId, } from './helpers';
import { isNil, assertType } from '@faast/ts-common';
import { StellarConnected } from './StellarConnected';
export class StellarPaymentsUtils extends StellarConnected {
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
        if (!isNil(extraId) && !(await this.isValidExtraId(extraId))) {
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
//# sourceMappingURL=StellarPaymentsUtil.js.map