import { assertType, DelegateLogger } from '@faast/ts-common';
import { BaseRippleConfig } from './types';
import { resolveRippleServer, retryIfDisconnected } from './utils';
import { PACKAGE_NAME, DEFAULT_NETWORK } from './constants';
export class RippleConnected {
    constructor(config = {}) {
        assertType(BaseRippleConfig, config);
        this.networkType = config.network || DEFAULT_NETWORK;
        this.logger = new DelegateLogger(config.logger, PACKAGE_NAME);
        const { api, server } = resolveRippleServer(config.server, this.networkType);
        this.api = api;
        this.server = server;
    }
    async init() {
        if (!this.api.isConnected()) {
            await this.api.connect();
        }
    }
    async destroy() {
        if (this.api.isConnected()) {
            await this.api.disconnect();
        }
    }
    async _retryDced(fn) {
        return retryIfDisconnected(fn, this.api, this.logger);
    }
}
//# sourceMappingURL=RippleConnected.js.map