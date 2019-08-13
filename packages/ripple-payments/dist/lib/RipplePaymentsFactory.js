import { HdRipplePaymentsConfig, AccountRipplePaymentsConfig } from './types';
import { HdRipplePayments } from './HdRipplePayments';
import { AccountRipplePayments } from './AccountRipplePayments';
export class RipplePaymentsFactory {
    forConfig(config) {
        if (HdRipplePaymentsConfig.is(config)) {
            return new HdRipplePayments(config);
        }
        if (AccountRipplePaymentsConfig.is(config)) {
            return new AccountRipplePayments(config);
        }
        throw new Error('Cannot instantiate ripple payments for unsupported config');
    }
}
export default RipplePaymentsFactory;
//# sourceMappingURL=RipplePaymentsFactory.js.map