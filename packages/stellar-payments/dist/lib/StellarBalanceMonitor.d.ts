/// <reference types="node" />
import { BalanceActivityCallback, GetBalanceActivityOptions, BalanceActivity, BalanceMonitor, RetrieveBalanceActivitiesResult } from '@faast/payments-common';
import { StellarRawTransaction } from './types';
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
    txToBalanceActivity(address: string, tx: StellarRawTransaction): Promise<BalanceActivity | null>;
}
