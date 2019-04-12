import { BaseTransactionInfo, BasePendingTransaction } from 'payments-common';
import {
  Transaction as TronTransaction,
  TransactionInfo as TronTransactionInfo,
  Block as TronBlock
} from 'tronweb'

export type TransactionInfoRaw = TronTransaction & TronTransactionInfo & {
  currentBlock: Pick<TronBlock, 'blockID' | 'block_header'>
}

export interface TransactionInfo extends BaseTransactionInfo<TransactionInfoRaw> {
  raw: TransactionInfoRaw
}

export interface SignedTransaction extends BasePendingTransaction<TronTransaction> {
  raw: TronTransaction
}

export interface CreateTransactionOptions {
  fee?: number // in sun
}

export interface GetAddressOptions {
  cacheIndex?: boolean
}
