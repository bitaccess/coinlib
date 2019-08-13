import { BalanceActivityCallback, GetBalanceActivityOptions, BalanceMonitor } from '@faast/payments-common';
import { RippleAPI } from 'ripple-lib';
import { RippleBalanceMonitorConfig } from './types';
export declare class RippleBalanceMonitor extends BalanceMonitor {
    rippleApi: RippleAPI;
    constructor(config: RippleBalanceMonitorConfig);
    init(): Promise<void>;
    destroy(): Promise<void>;
    subscribeAddresses(addresses: string[]): Promise<void>;
    onBalanceActivity(callbackFn: BalanceActivityCallback): void;
    retrieveBalanceActivities(address: string, callbackFn: BalanceActivityCallback, options?: GetBalanceActivityOptions): Promise<void>;
    private determineActivityTypes;
    private paymentToBalanceActivities;
}
