import { HdEthereumPaymentsConfig, KeyPairEthereumPaymentsConfig } from './types';
import { HdEthereumPayments } from './HdEthereumPayments';
import { KeyPairEthereumPayments } from './KeyPairEthereumPayments';
export class EthereumPaymentsFactory {
    forConfig(config) {
        if (HdEthereumPaymentsConfig.is(config)) {
            return new HdEthereumPayments(config);
        }
        if (KeyPairEthereumPaymentsConfig.is(config)) {
            return new KeyPairEthereumPayments(config);
        }
        throw new Error('Cannot instantiate ethereum payments for unsupported config');
    }
}
export default EthereumPaymentsFactory;
//# sourceMappingURL=EthereumPaymentsFactory.js.map