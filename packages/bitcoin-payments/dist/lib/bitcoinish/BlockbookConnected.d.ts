import { NetworkType } from '@faast/payments-common';
import { Logger } from '@faast/ts-common';
import { BlockbookBitcoin } from 'blockbook-client';
import { BlockbookConnectedConfig } from './types';
export declare abstract class BlockbookConnected {
    networkType: NetworkType;
    logger: Logger;
    api: BlockbookBitcoin | null;
    server: string | null;
    constructor(config: BlockbookConnectedConfig);
    getApi(): BlockbookBitcoin;
    init(): Promise<void>;
    destroy(): Promise<void>;
    _retryDced<T>(fn: () => Promise<T>): Promise<T>;
}
