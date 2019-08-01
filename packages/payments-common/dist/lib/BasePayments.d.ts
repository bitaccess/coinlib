import { BalanceResult, BaseUnsignedTransaction, BaseSignedTransaction, BaseTransactionInfo, BaseBroadcastResult, CreateTransactionOptions, FeeOption, ResolvedFeeOption, BaseConfig, Payport, FromTo } from './types';
import { PaymentsUtils } from './PaymentsUtils';
export declare type AnyPayments<C extends object = any> = BasePayments<C, BaseUnsignedTransaction, BaseSignedTransaction, BaseBroadcastResult, BaseTransactionInfo>;
export declare abstract class BasePayments<Config extends BaseConfig, UnsignedTransaction extends BaseUnsignedTransaction, SignedTransaction extends BaseSignedTransaction, BroadcastResult extends BaseBroadcastResult, TransactionInfo extends BaseTransactionInfo> extends PaymentsUtils {
    private readonly config;
    constructor(config: Config);
    getFullConfig(): Config;
    abstract getPublicConfig(): Config;
    resolvePayport<O extends object>(payportOrIndex: Payport | number, options?: O): Promise<Payport>;
    resolveFromTo<O extends object>(from: number, to: Payport | number, options?: O): Promise<FromTo>;
    abstract resolveFeeOption<O extends FeeOption>(feeOption: O): Promise<ResolvedFeeOption>;
    abstract getAccountIds(): string[];
    abstract getAccountId(index: number): string;
    abstract requiresBalanceMonitor(): boolean;
    abstract getPayport<O extends object>(index: number, options?: O): Promise<Payport>;
    abstract getBalance<O extends object>(payportOrIndex: Payport | number, options?: O): Promise<BalanceResult>;
    abstract getTransactionInfo<O extends object>(txId: string, payportOrIndex?: Payport | number, options?: O): Promise<TransactionInfo>;
    abstract createTransaction<O extends CreateTransactionOptions>(from: Payport | number, to: Payport | number, amount: string, options?: O): Promise<UnsignedTransaction>;
    abstract createSweepTransaction<O extends CreateTransactionOptions>(from: Payport | number, to: Payport | number, options?: O): Promise<UnsignedTransaction>;
    abstract signTransaction<O extends object>(unsignedTx: UnsignedTransaction, options?: O): Promise<SignedTransaction>;
    abstract broadcastTransaction<O extends object>(signedTx: SignedTransaction, options?: O): Promise<BroadcastResult>;
}
