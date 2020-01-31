import * as Stellar from 'stellar-sdk';
import { NetworkType, Payport } from '@faast/payments-common';
import { Logger } from '@faast/ts-common';
import { BaseStellarConfig, StellarLedger, StellarTransaction, StellarServerAPI } from './types';
export declare function isMatchingError(e: Error, partialMessages: string[]): boolean;
export declare function serializePayport(payport: Payport): string;
export declare function omitHidden(o: object): object;
export declare function isStellarLedger(x: unknown): x is StellarLedger;
export declare function isStellarTransaction(x: unknown): x is StellarTransaction;
export declare function isStellarTransactionRecord(x: unknown): x is Stellar.ServerApi.TransactionRecord;
export declare function padLeft(x: string, n: number, v: string): string;
export declare type ResolvedServer = {
    api: StellarServerAPI | null;
    server: string | null;
};
export declare function resolveStellarServer(server: BaseStellarConfig['server'], network: NetworkType): ResolvedServer;
export declare function retryIfDisconnected<T>(fn: () => Promise<T>, stellarApi: StellarServerAPI, logger: Logger): Promise<T>;
