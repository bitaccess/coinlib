import TronWeb from 'tronweb';
import { Balance, PaymentsInterface, BroadcastResult } from 'payments-common';
import { TransactionInfo, SignedTransaction, CreateTransactionOptions, GetAddressOptions } from './types';
import { toMainDenomination, toBaseDenomination } from './utils';
export interface BaseTronPaymentsConfig {
    fullNode?: string;
    solidityNode?: string;
    eventServer?: string;
}
export declare abstract class BaseTronPayments implements PaymentsInterface<TransactionInfo, SignedTransaction> {
    fullNode: string;
    solidityNode: string;
    eventServer: string;
    tronweb: TronWeb;
    constructor(config: BaseTronPaymentsConfig);
    static toMainDenomination: typeof toMainDenomination;
    static toBaseDenomination: typeof toBaseDenomination;
    toMainDenomination: typeof toMainDenomination;
    toBaseDenomination: typeof toBaseDenomination;
    isValidAddress(address: string): boolean;
    isValidPrivateKey(privateKey: string): boolean;
    privateKeyToAddress(privateKey: string): string;
    abstract getAddress(index: number, options?: GetAddressOptions): Promise<string>;
    abstract getAddressIndex(address: string): Promise<number>;
    abstract getPrivateKey(index: number): Promise<string>;
    getAddressOrNull(index: number, options?: GetAddressOptions): Promise<string | null>;
    getAddressIndexOrNull(address: string): Promise<number | null>;
    getBalance(addressOrIndex: string | number): Promise<Balance>;
    canSweep(addressOrIndex: string | number): Promise<boolean>;
    createSweepTransaction(from: string | number, to: string | number, options?: CreateTransactionOptions): Promise<SignedTransaction>;
    createTransaction(from: string | number, to: string | number, amountTrx: string, options?: CreateTransactionOptions): Promise<SignedTransaction>;
    broadcastTransaction(tx: SignedTransaction): Promise<BroadcastResult>;
    getTransactionInfo(txid: string): Promise<TransactionInfo>;
    private canSweepBalance;
    private extractTxFields;
    private resolveAddress;
    private resolveFromTo;
}
export default BaseTronPayments;
