import { BalanceActivityCallback, GetBalanceActivityOptions, BalanceMonitor, RetrieveBalanceActivitiesResult } from '@faast/payments-common';
import { RippleBalanceMonitorConfig } from './types';
import { RippleConnected } from './RippleConnected';
export declare class RippleBalanceMonitor extends RippleConnected implements BalanceMonitor {
    config: RippleBalanceMonitorConfig;
    constructor(config: RippleBalanceMonitorConfig);
    subscribeAddresses(addresses: string[]): Promise<void>;
    onBalanceActivity(callbackFn: BalanceActivityCallback): void;
    resolveFromToLedgers(options: GetBalanceActivityOptions): Promise<RetrieveBalanceActivitiesResult>;
    retrieveBalanceActivities(address: string, callbackFn: BalanceActivityCallback, options?: GetBalanceActivityOptions): Promise<RetrieveBalanceActivitiesResult>;
    private isPaymentTx;
    private txToBalanceActivity;
}
