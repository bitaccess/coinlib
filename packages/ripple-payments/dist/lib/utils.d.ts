import { BaseRippleConfig } from './types';
import { RippleAPI } from 'ripple-lib';
import { NetworkType } from '@faast/payments-common';
import { Logger } from '@faast/ts-common';
export declare function padLeft(x: string, n: number, v: string): string;
export declare function resolveRippleServer(server: BaseRippleConfig['server'], network: NetworkType): RippleAPI;
export declare function retryIfDisconnected<T>(fn: () => Promise<T>, rippleApi: RippleAPI, logger: Logger): Promise<T>;
