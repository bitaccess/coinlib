import * as Stellar from 'stellar-sdk';
import { NetworkType } from '@faast/payments-common';
import promiseRetry from 'promise-retry';
import { isString, isObject } from '@faast/ts-common';
import { DEFAULT_TESTNET_SERVER, DEFAULT_MAINNET_SERVER } from './constants';
export function isStellarLedger(x) {
    return isObject(x) && x.hasOwnProperty('successful_transaction_count');
}
export function isStellarTransaction(x) {
    return isObject(x) && x.hasOwnProperty('source_account');
}
export function padLeft(x, n, v) {
    while (x.length < n) {
        x = `${v}${x}`;
    }
    return x;
}
export function resolveStellarServer(server, network) {
    if (typeof server === 'undefined') {
        server = network === NetworkType.Testnet ? DEFAULT_TESTNET_SERVER : DEFAULT_MAINNET_SERVER;
    }
    if (isString(server)) {
        return {
            api: new Stellar.Server(server),
            server,
        };
    }
    else if (server instanceof Stellar.Server) {
        return {
            api: server,
            server: server.serverURL.toString(),
        };
    }
    else {
        return {
            api: null,
            server: null,
        };
    }
}
const CONNECTION_ERRORS = ['ConnectionError', 'NotConnectedError', 'DisconnectedError'];
const RETRYABLE_ERRORS = [...CONNECTION_ERRORS, 'TimeoutError'];
const MAX_RETRIES = 3;
export function retryIfDisconnected(fn, stellarApi, logger) {
    return promiseRetry((retry, attempt) => {
        return fn().catch(async (e) => {
            const eName = e ? e.constructor.name : '';
            if (RETRYABLE_ERRORS.includes(eName)) {
                logger.log(`Retryable error during stellar server call, retrying ${MAX_RETRIES - attempt} more times`, e.toString());
                retry(e);
            }
            throw e;
        });
    }, {
        retries: MAX_RETRIES,
    });
}
//# sourceMappingURL=utils.js.map