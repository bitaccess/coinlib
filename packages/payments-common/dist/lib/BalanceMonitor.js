import { DelegateLogger } from '@faast/ts-common';
import { NetworkType, } from './types';
export class BalanceMonitor {
    constructor(config) {
        this.networkType = config.network || NetworkType.Mainnet;
        this.logger = new DelegateLogger(config.logger, BalanceMonitor.name);
    }
}
//# sourceMappingURL=BalanceMonitor.js.map