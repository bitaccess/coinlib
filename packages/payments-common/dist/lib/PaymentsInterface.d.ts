import { Numeric } from '@faast/ts-common';
import { BalanceResult, BaseUnsignedTransaction, BaseSignedTransaction, BaseTransactionInfo, BaseBroadcastResult, CreateTransactionOptions, FeeOption, ResolvedFeeOption, BaseConfig, Payport, FromTo } from './types';
export declare type AnyPayments<C extends object = any> = PaymentsInterface<C, BaseUnsignedTransaction, BaseSignedTransaction, BaseBroadcastResult, BaseTransactionInfo>;
export interface PaymentsInterface<Config extends BaseConfig, UnsignedTransaction extends BaseUnsignedTransaction, SignedTransaction extends BaseSignedTransaction, BroadcastResult extends BaseBroadcastResult, TransactionInfo extends BaseTransactionInfo> {
    toMainDenomination<O extends object>(amount: Numeric, options?: O): string;
    toBaseDenomination<O extends object>(amount: Numeric, options?: O): string;
    isValidPayport<O extends object>(payport: Payport, options?: O): boolean | Promise<boolean>;
    resolvePayport<O extends object>(payportOrIndex: Payport | number, options?: O): Promise<Payport>;
    resolveFromTo<O extends object>(from: Payport | number, to: Payport | number, options?: O): Promise<FromTo>;
    getFullConfig(): Config;
    getPublicConfig(): Config;
    getAccountIds(): string[];
    getAccountId(index: number): string;
    getPayport<O extends object>(index: number, options?: O): Promise<Payport>;
    requiresBalanceTracker(): boolean;
    getBalance<O extends object>(payportOrIndex: Payport | number, options?: O): Promise<BalanceResult>;
    getTransactionInfo<O extends object>(txId: string, payportOrIndex?: Payport | number, options?: O): Promise<TransactionInfo>;
    resolveFeeOption<O extends FeeOption>(feeOption: O): Promise<ResolvedFeeOption>;
    createTransaction<O extends CreateTransactionOptions>(from: Payport | number, to: Payport | number, amount: string, options?: O): Promise<UnsignedTransaction>;
    createSweepTransaction<O extends CreateTransactionOptions>(from: Payport | number, to: Payport | number, options?: O): Promise<UnsignedTransaction>;
    signTransaction<O extends object>(unsignedTx: UnsignedTransaction, options?: O): Promise<SignedTransaction>;
    broadcastTransaction<O extends object>(signedTx: SignedTransaction, options?: O): Promise<BroadcastResult>;
}
