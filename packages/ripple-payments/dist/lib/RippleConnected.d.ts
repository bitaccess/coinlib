import { NetworkType } from '@faast/payments-common';
import { RippleAPI } from 'ripple-lib';
import { Logger } from '@faast/ts-common';
import { BaseRippleConfig } from './types';
export declare abstract class RippleConnected {
    networkType: NetworkType;
    logger: Logger;
    api: RippleAPI;
    server: string | null;
    constructor(config?: BaseRippleConfig);
    init(): Promise<void>;
    destroy(): Promise<void>;
    _retryDced<T>(fn: () => Promise<T>): Promise<T>;
}
