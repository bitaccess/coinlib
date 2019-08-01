import { Logger } from '@faast/ts-common';
import { NetworkType, BalanceMonitorConfig, BalanceActivityCallback, GetBalanceActivityOptions } from './types';
export declare abstract class BalanceMonitor {
    networkType: NetworkType;
    logger: Logger;
    constructor(config: BalanceMonitorConfig);
    abstract init(): Promise<void>;
    abstract subscribeAddresses(addresses: string[]): Promise<void>;
    abstract onBalanceActivity(callbackFn: BalanceActivityCallback): void;
    abstract retrieveBalanceActivities(address: string, callbackFn: BalanceActivityCallback, options?: GetBalanceActivityOptions): Promise<void>;
}
