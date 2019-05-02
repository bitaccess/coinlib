import { HdTronPayments } from './HdTronPayments';
import { KeyPairTronPayments } from './KeyPairTronPayments';
export class TronPaymentsFactory {
    forConfig(config) {
        if (config.hdKey) {
            return new HdTronPayments(config);
        }
        if (config.keyPairs) {
            return new KeyPairTronPayments(config);
        }
        throw new Error('Cannot instantiate tron payments for unsupported config');
    }
}
export default TronPaymentsFactory;
//# sourceMappingURL=TronPaymentsFactory.js.map