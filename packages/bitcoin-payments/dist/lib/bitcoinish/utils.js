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
    let maxNoWitness;
    let maxSize;
    let maxWitness;
    let minNoWitness;
    let minSize;
    let minWitness;
    let varintLength;
    if (inputsCount < 0xfd) {
        varintLength = 1;
    }
    else if (inputsCount < 0xffff) {
        varintLength = 3;
    }
    else {
        varintLength = 5;
    }
    if (handleSegwit) {
        minNoWitness =
            varintLength + 4 + 2 + 59 * inputsCount + 1 + 31 * outputsCount + 4;
        maxNoWitness =
            varintLength + 4 + 2 + 59 * inputsCount + 1 + 33 * outputsCount + 4;
        minWitness =
            varintLength +
                4 +
                2 +
                59 * inputsCount +
                1 +
                31 * outputsCount +
                4 +
                106 * inputsCount;
        maxWitness =
            varintLength +
                4 +
                2 +
                59 * inputsCount +
                1 +
                33 * outputsCount +
                4 +
                108 * inputsCount;
        minSize = (minNoWitness * 3 + minWitness) / 4;
        maxSize = (maxNoWitness * 3 + maxWitness) / 4;
    }
    else {
        minSize = varintLength + 4 + 146 * inputsCount + 1 + 31 * outputsCount + 4;
        maxSize = varintLength + 4 + 148 * inputsCount + 1 + 33 * outputsCount + 4;
    }
    return {
        min: minSize,
        max: maxSize
    };
}
export function estimateTxFee(satPerByte, inputsCount, outputsCount, handleSegwit) {
    const { min, max } = estimateTxSize(inputsCount, outputsCount, handleSegwit);
    const mean = Math.ceil((min + max) / 2);
    return mean * satPerByte;
}
export function sortUtxos(utxoList) {
    const matureList = [];
    const immatureList = [];
    utxoList.forEach((utxo) => {
        if (utxo.confirmations && utxo.confirmations >= 6) {
            matureList.push(utxo);
        }
        else {
            immatureList.push(utxo);
        }
    });
    matureList.sort((a, b) => toBigNumber(a.value).minus(b.value).toNumber());
    immatureList.sort((a, b) => (b.confirmations || 0) - (a.confirmations || 0));
    return matureList.concat(immatureList);
}
//# sourceMappingURL=utils.js.map