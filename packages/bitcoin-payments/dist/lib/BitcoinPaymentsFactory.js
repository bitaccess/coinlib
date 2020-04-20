import { HdBitcoinPaymentsConfig, KeyPairBitcoinPaymentsConfig, MultisigBitcoinPaymentsConfig, } from './types';
import { HdBitcoinPayments } from './HdBitcoinPayments';
import { KeyPairBitcoinPayments } from './KeyPairBitcoinPayments';
import { MultisigBitcoinPayments } from './MultisigBitcoinPayments';
export class BitcoinPaymentsFactory {
    forConfig(config) {
        if (HdBitcoinPaymentsConfig.is(config)) {
            return new HdBitcoinPayments(config);
        }
        if (KeyPairBitcoinPaymentsConfig.is(config)) {
            return new KeyPairBitcoinPayments(config);
        }
        if (MultisigBitcoinPaymentsConfig.is(config)) {
            return new MultisigBitcoinPayments(config);
        }
        throw new Error('Cannot instantiate bitcoin payments for unsupported config');
    }
}
export default BitcoinPaymentsFactory;
//# sourceMappingURL=BitcoinPaymentsFactory.js.map