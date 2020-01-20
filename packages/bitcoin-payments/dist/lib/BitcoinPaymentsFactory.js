import { HdBitcoinPaymentsConfig } from './types';
import { HdBitcoinPayments } from './HdBitcoinPayments';
export class BitcoinPaymentsFactory {
    forConfig(config) {
        if (HdBitcoinPaymentsConfig.is(config)) {
            return new HdBitcoinPayments(config);
        }
        throw new Error('Cannot instantiate bitcoin payments for unsupported config');
    }
}
export default BitcoinPaymentsFactory;
//# sourceMappingURL=BitcoinPaymentsFactory.js.map