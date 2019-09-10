import { BaseRippleConfig } from './types';
import { RippleAPI } from 'ripple-lib';
import { NetworkType } from '@faast/payments-common';
import { Logger } from '@faast/ts-common';
export declare function padLeft(x: string, n: number, v: string): string;
export declare type ResolvedServer = {
    api: RippleAPI;
    server: string | null;
};
export declare function resolveRippleServer(server: BaseRippleConfig['server'], network: NetworkType): ResolvedServer;
export declare function retryIfDisconnected<T>(fn: () => Promise<T>, rippleApi: RippleAPI, logger: Logger): Promise<T>;
