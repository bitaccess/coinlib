import { NetworkType } from '@faast/payments-common';
import { Logger } from '@faast/ts-common';
import * as Stellar from 'stellar-sdk';
import { BaseStellarConfig, StellarRawLedger, StellarRawTransaction } from './types';
import BigNumber from 'bignumber.js';
export declare abstract class StellarConnected {
    networkType: NetworkType;
    logger: Logger;
    api: Stellar.Server | null;
    server: string | null;
    constructor(config?: BaseStellarConfig);
    getApi(): Stellar.Server;
    init(): Promise<void>;
    destroy(): Promise<void>;
    _retryDced<T>(fn: () => Promise<T>): Promise<T>;
    getBlock(id?: string | number): Promise<StellarRawLedger>;
    _normalizeTxOperation(tx: StellarRawTransaction): Promise<{
        amount: BigNumber;
        fee: BigNumber;
        fromAddress: string;
        toAddress: string;
    }>;
}
