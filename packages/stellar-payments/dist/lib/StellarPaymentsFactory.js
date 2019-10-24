import { HdStellarPaymentsConfig, AccountStellarPaymentsConfig } from './types';
import { HdStellarPayments } from './HdStellarPayments';
import { AccountStellarPayments } from './AccountStellarPayments';
import { assertType } from '@faast/ts-common';
export class StellarPaymentsFactory {
    forConfig(config) {
        if (AccountStellarPaymentsConfig.is(config)) {
            return new AccountStellarPayments(config);
        }
        return new HdStellarPayments(assertType(HdStellarPaymentsConfig, config));
    }
}
export default StellarPaymentsFactory;
//# sourceMappingURL=StellarPaymentsFactory.js.map