import { BaseTransactionInfo, BaseUnsignedTransaction, BaseSignedTransaction } from 'payments-common';
import { Transaction as TronTransaction, TransactionInfo as TronTransactionInfo, Block as TronBlock } from 'tronweb';
export declare type TransactionInfoRaw = TronTransaction & TronTransactionInfo & {
    currentBlock: Pick<TronBlock, 'blockID' | 'block_header'>;
};
export interface UnsignedTransaction extends BaseUnsignedTransaction<TronTransaction> {
    id: string;
    amount: string;
    fee: string;
}
export interface SignedTransaction extends BaseSignedTransaction<TronTransaction> {
}
export interface TransactionInfo extends BaseTransactionInfo<TransactionInfoRaw> {
    from: string;
    to: string;
}
export interface CreateTransactionOptions {
    fee?: number;
}
export interface GetAddressOptions {
    cacheIndex?: boolean;
}
