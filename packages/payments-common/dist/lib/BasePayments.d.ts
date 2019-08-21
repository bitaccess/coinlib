import { BalanceResult, BaseUnsignedTransaction, BaseSignedTransaction, BaseTransactionInfo, BaseBroadcastResult, CreateTransactionOptions, FeeOption, ResolvedFeeOption, BaseConfig, Payport, FromTo, ResolveablePayport } from './types';
import { PaymentsUtils } from './PaymentsUtils';
export declare type AnyPayments<C extends object = any> = BasePayments<C, BaseUnsignedTransaction, BaseSignedTransaction, BaseBroadcastResult, BaseTransactionInfo>;
export interface BasePayments<Config extends BaseConfig, UnsignedTransaction extends BaseUnsignedTransaction, SignedTransaction extends BaseSignedTransaction, BroadcastResult extends BaseBroadcastResult, TransactionInfo extends BaseTransactionInfo> extends PaymentsUtils {
    init(): Promise<void>;
    destroy(): Promise<void>;
    getFullConfig(): Config;
    getPublicConfig(): Config;
    resolvePayport<O extends object>(payport: ResolveablePayport, options?: O): Promise<Payport>;
    resolveFromTo<O extends object>(from: number, to: ResolveablePayport, options?: O): Promise<FromTo>;
    resolveFeeOption<O extends FeeOption>(feeOption: O): Promise<ResolvedFeeOption>;
    getAccountIds(): string[];
    getAccountId(index: number): string;
    requiresBalanceMonitor(): boolean;
    getPayport<O extends object>(index: number, options?: O): Promise<Payport>;
    getBalance<O extends object>(payport: ResolveablePayport, options?: O): Promise<BalanceResult>;
    isSweepableBalance(balance: string, payport?: ResolveablePayport): boolean;
    getTransactionInfo<O extends object>(txId: string, payport?: ResolveablePayport, options?: O): Promise<TransactionInfo>;
    createTransaction<O extends CreateTransactionOptions>(from: number, to: ResolveablePayport, amount: string, options?: O): Promise<UnsignedTransaction>;
    createSweepTransaction<O extends CreateTransactionOptions>(from: number, to: ResolveablePayport, options?: O): Promise<UnsignedTransaction>;
    signTransaction<O extends object>(unsignedTx: UnsignedTransaction, options?: O): Promise<SignedTransaction>;
    broadcastTransaction<O extends object>(signedTx: SignedTransaction, options?: O): Promise<BroadcastResult>;
}
