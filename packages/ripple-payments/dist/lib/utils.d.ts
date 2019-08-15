import { BaseRippleConfig } from './types';
import { RippleAPI } from 'ripple-lib';
import { NetworkType } from '@faast/payments-common';
export declare function padLeft(x: string, n: number, v: string): string;
export declare function resolveRippleServer(server: BaseRippleConfig['server'], network: NetworkType): RippleAPI;
