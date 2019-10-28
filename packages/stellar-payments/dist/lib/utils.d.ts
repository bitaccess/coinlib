import * as Stellar from 'stellar-sdk';
import { NetworkType, Payport } from '@faast/payments-common';
import { Logger } from '@faast/ts-common';
import { BaseStellarConfig, StellarLedger, StellarTransaction } from './types';
export declare function serializePayport(payport: Payport): string;
export declare function omitHidden(o: object): object;
export declare function isStellarLedger(x: unknown): x is StellarLedger;
export declare function isStellarTransaction(x: unknown): x is StellarTransaction;
export declare function padLeft(x: string, n: number, v: string): string;
export declare type ResolvedServer = {
    api: Stellar.Server | null;
    server: string | null;
};
export declare function resolveStellarServer(server: BaseStellarConfig['server'], network: NetworkType): ResolvedServer;
export declare function retryIfDisconnected<T>(fn: () => Promise<T>, stellarApi: Stellar.Server, logger: Logger): Promise<T>;
