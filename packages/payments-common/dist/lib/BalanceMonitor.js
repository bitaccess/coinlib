import { DelegateLogger } from '@faast/ts-common';
export class BalanceMonitor {
    constructor(config) {
        this.networkType = config.network;
        this.logger = new DelegateLogger(config.logger, BalanceMonitor.name);
    }
}
//# sourceMappingURL=BalanceMonitor.js.map