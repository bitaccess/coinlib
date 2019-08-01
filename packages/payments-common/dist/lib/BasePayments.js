import { PaymentsUtils } from './PaymentsUtils';
export class BasePayments extends PaymentsUtils {
    constructor(config) {
        super(config);
        this.config = config;
    }
    getFullConfig() {
        return this.config;
    }
    async resolvePayport(payportOrIndex, options) {
        if (typeof payportOrIndex === 'number') {
            return this.getPayport(payportOrIndex, options);
        }
        return payportOrIndex;
    }
    async resolveFromTo(from, to, options) {
        const fromPayport = await this.getPayport(from);
        const toPayport = await this.resolvePayport(to);
        return {
            fromAddress: fromPayport.address,
            fromIndex: from,
            fromExtraId: fromPayport.extraId,
            toAddress: toPayport.address,
            toIndex: typeof to === 'number' ? to : null,
            toExtraId: toPayport.extraId,
        };
    }
}
//# sourceMappingURL=BasePayments.js.map