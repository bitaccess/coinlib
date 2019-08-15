import { RippleAPI } from 'ripple-lib';
import { isString } from 'util';
import { NetworkType } from '@faast/payments-common';
import { DEFAULT_TESTNET_SERVER, DEFAULT_MAINNET_SERVER } from './constants';
export function padLeft(x, n, v) {
    while (x.length < n) {
        x = `${v}${x}`;
    }
    return x;
}
export function resolveRippleServer(server, network) {
    if (typeof server === 'undefined') {
        server = network === NetworkType.Testnet ? DEFAULT_TESTNET_SERVER : DEFAULT_MAINNET_SERVER;
    }
    if (isString(server)) {
        return new RippleAPI({
            server: server,
        });
    }
    else if (server instanceof RippleAPI) {
        return server;
    }
    else {
        return new RippleAPI();
    }
}
//# sourceMappingURL=utils.js.map