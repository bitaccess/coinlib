import { BalanceResult, BaseUnsignedTransaction, BaseSignedTransaction, BaseTransactionInfo, BaseBroadcastResult, CreateTransactionOptions, FeeOption, ResolvedFeeOption, BaseConfig, Payport, FromTo } from './types';
import { PaymentsUtils } from './PaymentsUtils';
export declare type AnyPayments<C extends object = any> = BasePayments<C, BaseUnsignedTransaction, BaseSignedTransaction, BaseBroadcastResult, BaseTransactionInfo>;
export interface BasePayments<Config extends BaseConfig, UnsignedTransaction extends BaseUnsignedTransaction, SignedTransaction extends BaseSignedTransaction, BroadcastResult extends BaseBroadcastResult, TransactionInfo extends BaseTransactionInfo> extends PaymentsUtils {
    getFullConfig(): Config;
    getPublicConfig(): Config;
    resolvePayport<O extends object>(payportOrIndex: Payport | number, options?: O): Promise<Payport>;
    resolveFromTo<O extends object>(from: number, to: Payport | number, options?: O): Promise<FromTo>;
    resolveFeeOption<O extends FeeOption>(feeOption: O): Promise<ResolvedFeeOption>;
    getAccountIds(): string[];
    getAccountId(index: number): string;
    requiresBalanceMonitor(): boolean;
    getPayport<O extends object>(index: number, options?: O): Promise<Payport>;
    getBalance<O extends object>(payportOrIndex: Payport | number, options?: O): Promise<BalanceResult>;
    getTransactionInfo<O extends object>(txId: string, payportOrIndex?: Payport | number, options?: O): Promise<TransactionInfo>;
    createTransaction<O extends CreateTransactionOptions>(from: Payport | number, to: Payport | number, amount: string, options?: O): Promise<UnsignedTransaction>;
    createSweepTransaction<O extends CreateTransactionOptions>(from: Payport | number, to: Payport | number, options?: O): Promise<UnsignedTransaction>;
    signTransaction<O extends object>(unsignedTx: UnsignedTransaction, options?: O): Promise<SignedTransaction>;
    broadcastTransaction<O extends object>(signedTx: SignedTransaction, options?: O): Promise<BroadcastResult>;
}
