import { BalanceActivityCallback, GetBalanceActivityOptions, RetrieveBalanceActivitiesResult, BalanceActivity } from './types';
export interface BalanceMonitor {
    init(): Promise<void>;
    destroy(): Promise<void>;
    subscribeAddresses(addresses: string[]): Promise<void>;
    onBalanceActivity(callbackFn: BalanceActivityCallback): void;
    retrieveBalanceActivities(address: string, callbackFn: BalanceActivityCallback, options?: GetBalanceActivityOptions): Promise<RetrieveBalanceActivitiesResult>;
    txToBalanceActivity(address: string, tx: object): Promise<BalanceActivity | null>;
}
