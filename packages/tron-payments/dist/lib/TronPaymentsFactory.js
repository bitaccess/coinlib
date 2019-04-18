import { HdTronPayments } from './HdTronPayments';
import { KeyPairTronPayments } from './KeyPairTronPayments';
var TronPaymentsFactory = (function () {
    function TronPaymentsFactory() {
    }
    TronPaymentsFactory.prototype.forConfig = function (config) {
        if (config.hdKey) {
            return new HdTronPayments(config);
        }
        if (config.keyPairs) {
            return new KeyPairTronPayments(config);
        }
        throw new Error('Cannot instantiate tron payments for unsupported config');
    };
    return TronPaymentsFactory;
}());
export { TronPaymentsFactory };
export default TronPaymentsFactory;
//# sourceMappingURL=TronPaymentsFactory.js.map