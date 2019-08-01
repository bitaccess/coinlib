import { NetworkType } from './types';
export class PaymentsUtils {
    constructor(config) {
        this.networkType = config.network || NetworkType.Mainnet;
    }
    async isValidPayport(payport, options) {
        const { address, extraId } = payport;
        return ((await this.isValidAddress(address, options)) &&
            (typeof extraId === 'string' ? this.isValidExtraId(extraId, options) : true));
    }
}
//# sourceMappingURL=PaymentsUtils.js.map