import { BalanceResult, BaseUnsignedTransaction, BaseSignedTransaction, BaseTransactionInfo, BaseBroadcastResult } from './types';
export declare type AnyPayments = PaymentsInterface<BaseUnsignedTransaction, BaseSignedTransaction, BaseBroadcastResult, BaseTransactionInfo>;
export interface PaymentsInterface<UnsignedTransaction extends BaseUnsignedTransaction, SignedTransaction extends BaseSignedTransaction, BroadcastResult extends BaseBroadcastResult, TransactionInfo extends BaseTransactionInfo> {
    toMainDenomination<O extends object>(amount: number | string, options?: O): string;
    toBaseDenomination<O extends object>(amount: number | string, options?: O): string;
    isValidAddress<O extends object>(address: string, options?: O): boolean;
    resolveAddress<O extends object>(addressOrIndex: string | number, options?: O): Promise<string>;
    resolveFromTo<O extends object>(from: string | number, to: string | number, options?: O): Promise<{
        fromIndex: number;
        fromAddress: string;
        toIndex: number | null;
        toAddress: string;
    }>;
    getAddressIndex<O extends object>(address: string, options?: O): Promise<number>;
    getAddressIndexOrNull<O extends object>(address: string, options?: O): Promise<number | null>;
    getAddress<O extends object>(index: number, options?: O): Promise<string>;
    getAddressOrNull<O extends object>(index: number, options?: O): Promise<string | null>;
    getBalance<O extends object>(addressOrIndex: string | number, options?: O): Promise<BalanceResult>;
    getTransactionInfo<O extends object>(txId: string, addressOrIndex: string | number, options?: O): Promise<TransactionInfo>;
    createTransaction<O extends object>(from: string | number, to: string | number, amount: string, options?: O): Promise<UnsignedTransaction>;
    createSweepTransaction<O extends object>(from: string | number, to: string | number, options?: O): Promise<UnsignedTransaction>;
    signTransaction<O extends object>(unsignedTx: UnsignedTransaction, options?: O): Promise<SignedTransaction>;
    broadcastTransaction<O extends object>(signedTx: SignedTransaction, options?: O): Promise<BroadcastResult>;
}
