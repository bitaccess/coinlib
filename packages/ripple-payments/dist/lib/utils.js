import { RippleAPI } from 'ripple-lib';
import { isString } from 'util';
import { NetworkType } from '@faast/payments-common';
import promiseRetry from 'promise-retry';
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
        return {
            api: new RippleAPI({
                server,
            }),
            server,
        };
    }
    else if (server instanceof RippleAPI) {
        return {
            api: server,
            server: server.connection._url || '',
        };
    }
    else {
        return {
            api: new RippleAPI(),
            server: null,
        };
    }
}
const CONNECTION_ERRORS = ['ConnectionError', 'NotConnectedError', 'DisconnectedError'];
const RETRYABLE_ERRORS = [...CONNECTION_ERRORS, 'TimeoutError'];
const MAX_RETRIES = 3;
export function retryIfDisconnected(fn, rippleApi, logger) {
    return promiseRetry((retry, attempt) => {
        return fn().catch(async (e) => {
            const eName = e ? e.constructor.name : '';
            if (RETRYABLE_ERRORS.includes(eName)) {
                if (CONNECTION_ERRORS.includes(eName)) {
                    logger.log('Connection error during rippleApi call, attempting to reconnect then ' +
                        `retrying ${MAX_RETRIES - attempt} more times`, e.toString());
                    if (rippleApi.isConnected()) {
                        await rippleApi.disconnect();
                    }
                    await rippleApi.connect();
                }
                else {
                    logger.log(`Retryable error during rippleApi call, retrying ${MAX_RETRIES - attempt} more times`, e.toString());
                }
                retry(e);
            }
            throw e;
        });
    }, {
        retries: MAX_RETRIES,
    });
}
//# sourceMappingURL=utils.js.map