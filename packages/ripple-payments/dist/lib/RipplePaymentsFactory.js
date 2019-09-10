import { HdRipplePaymentsConfig, AccountRipplePaymentsConfig } from './types';
import { HdRipplePayments } from './HdRipplePayments';
import { AccountRipplePayments } from './AccountRipplePayments';
import { assertType } from '@faast/ts-common';
export class RipplePaymentsFactory {
    forConfig(config) {
        if (AccountRipplePaymentsConfig.is(config)) {
            return new AccountRipplePayments(config);
        }
        return new HdRipplePayments(assertType(HdRipplePaymentsConfig, config));
    }
}
export default RipplePaymentsFactory;
//# sourceMappingURL=RipplePaymentsFactory.js.map