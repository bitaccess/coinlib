import { assertType, DelegateLogger } from '@faast/ts-common';
import { BlockbookConnectedConfig } from './types';
import { resolveServer, retryIfDisconnected } from './utils';
export class BlockbookConnected {
    constructor(config) {
        assertType(BlockbookConnectedConfig, config);
        this.networkType = config.network;
        this.logger = new DelegateLogger(config.logger);
        const { api, server } = resolveServer(config.server, this.networkType);
        this.api = api;
        this.server = server;
    }
    getApi() {
        if (this.api === null) {
            throw new Error('Cannot access Bitcoin network when configured with null server');
        }
        return this.api;
    }
    async init() { }
    async destroy() { }
    async _retryDced(fn) {
        return retryIfDisconnected(fn, this.getApi(), this.logger);
    }
}
//# sourceMappingURL=BlockbookConnected.js.map