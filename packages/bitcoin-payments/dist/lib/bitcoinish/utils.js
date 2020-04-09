import { BlockbookBitcoin } from 'blockbook-client';
import { isString, isMatchingError, toBigNumber } from '@faast/ts-common';
import promiseRetry from 'promise-retry';
export function resolveServer(server, network) {
    if (isString(server)) {
        return {
            api: new BlockbookBitcoin({
                nodes: [server],
            }),
            server: [server],
        };
    }
    else if (server instanceof BlockbookBitcoin) {
        return {
            api: server,
            server: server.nodes,
        };
    }
    else if (Array.isArray(server)) {
        return {
            api: new BlockbookBitcoin({
                nodes: server,
            }),
            server,
        };
    }
    else {
        return {
            api: new BlockbookBitcoin({
                nodes: [''],
            }),
            server: null,
        };
    }
}
const RETRYABLE_ERRORS = ['timeout', 'disconnected'];
const MAX_RETRIES = 3;
export function retryIfDisconnected(fn, api, logger) {
    return promiseRetry((retry, attempt) => {
        return fn().catch(async (e) => {
            if (isMatchingError(e, RETRYABLE_ERRORS)) {
                logger.log(`Retryable error during blockbook server call, retrying ${MAX_RETRIES - attempt} more times`, e.toString());
                retry(e);
            }
            throw e;
        });
    }, {
        retries: MAX_RETRIES,
    });
}
export function estimateTxSize(inputsCount, outputsCount, handleSegwit) {
    return 10 + (148 * inputsCount) + (34 * outputsCount);
}
export function estimateTxFee(satPerByte, inputsCount, outputsCount, handleSegwit) {
    return estimateTxSize(inputsCount, outputsCount, handleSegwit) * satPerByte;
}
export function sumUtxoValue(utxos) {
    return utxos.reduce((total, { value }) => total.plus(value), toBigNumber(0));
}
export function sortUtxos(utxoList) {
    const result = [...utxoList];
    result.sort((a, b) => toBigNumber(a.value).minus(b.value).toNumber());
    return result;
}
export function isConfirmedUtxo(utxo) {
    return Boolean((utxo.confirmations && utxo.confirmations > 0) || (utxo.height && Number.parseInt(utxo.height) > 0));
}
//# sourceMappingURL=utils.js.map