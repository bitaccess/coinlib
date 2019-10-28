import { BalanceActivityCallback, GetBalanceActivityOptions, BalanceActivity, BalanceMonitor, RetrieveBalanceActivitiesResult } from '@faast/payments-common';
import { FormattedTransactionType } from 'ripple-lib/dist/npm/transaction/types';
import { RippleBalanceMonitorConfig } from './types';
import { RippleConnected } from './RippleConnected';
export declare class RippleBalanceMonitor extends RippleConnected implements BalanceMonitor {
    config: RippleBalanceMonitorConfig;
    constructor(config: RippleBalanceMonitorConfig);
    subscribeAddresses(addresses: string[]): Promise<void>;
    onBalanceActivity(callbackFn: BalanceActivityCallback): void;
    private resolveFromToLedgers;
    retrieveBalanceActivities(address: string, callbackFn: BalanceActivityCallback, options?: GetBalanceActivityOptions): Promise<RetrieveBalanceActivitiesResult>;
    private isPaymentTx;
    txToBalanceActivity(address: string, tx: FormattedTransactionType): Promise<BalanceActivity | null>;
}
