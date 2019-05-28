import { HdTronPaymentsConfig, KeyPairTronPaymentsConfig } from './types';
import { HdTronPayments } from './HdTronPayments';
import { KeyPairTronPayments } from './KeyPairTronPayments';
export class TronPaymentsFactory {
    forConfig(config) {
        if (HdTronPaymentsConfig.is(config)) {
            return new HdTronPayments(config);
        }
        if (KeyPairTronPaymentsConfig.is(config)) {
            return new KeyPairTronPayments(config);
        }
        throw new Error('Cannot instantiate tron payments for unsupported config');
    }
}
export default TronPaymentsFactory;
//# sourceMappingURL=TronPaymentsFactory.js.map