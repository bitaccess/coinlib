/// <reference types="node" />
import { BalanceActivityCallback, GetBalanceActivityOptions, BalanceMonitor, RetrieveBalanceActivitiesResult } from '@faast/payments-common';
import { StellarConnected } from './StellarConnected';
import { EventEmitter } from 'events';
export declare class StellarBalanceMonitor extends StellarConnected implements BalanceMonitor {
    txEmitter: EventEmitter;
    _subscribeCancellors: Function[];
    destroy(): Promise<void>;
    subscribeAddresses(addresses: string[]): Promise<void>;
    onBalanceActivity(callbackFn: BalanceActivityCallback): void;
    resolveFromToLedgers(options: GetBalanceActivityOptions): Promise<RetrieveBalanceActivitiesResult>;
    retrieveBalanceActivities(address: string, callbackFn: BalanceActivityCallback, options?: GetBalanceActivityOptions): Promise<RetrieveBalanceActivitiesResult>;
    private txToBalanceActivity;
}
