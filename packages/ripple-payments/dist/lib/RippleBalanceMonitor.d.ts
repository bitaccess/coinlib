import { BalanceActivityCallback, GetBalanceActivityOptions, BalanceMonitor, RetrieveBalanceActivitiesResult } from '@faast/payments-common';
import { RippleAPI } from 'ripple-lib';
import { RippleBalanceMonitorConfig } from './types';
export declare class RippleBalanceMonitor extends BalanceMonitor {
    rippleApi: RippleAPI;
    constructor(config: RippleBalanceMonitorConfig);
    init(): Promise<void>;
    destroy(): Promise<void>;
    private retryDced;
    subscribeAddresses(addresses: string[]): Promise<void>;
    onBalanceActivity(callbackFn: BalanceActivityCallback): void;
    resolveFromToLedgers(options: GetBalanceActivityOptions): Promise<RetrieveBalanceActivitiesResult>;
    retrieveBalanceActivities(address: string, callbackFn: BalanceActivityCallback, options?: GetBalanceActivityOptions): Promise<RetrieveBalanceActivitiesResult>;
    private isPaymentTx;
    private txToBalanceActivity;
}
