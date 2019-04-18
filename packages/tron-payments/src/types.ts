import { BaseTransactionInfo, BaseUnsignedTransaction, BaseSignedTransaction } from 'payments-common'
import {
  Transaction as TronTransaction,
  TransactionInfo as TronTransactionInfo,
  Block as TronBlock
} from 'tronweb'

export interface BaseTronPaymentsConfig {
  fullNode?: string
  solidityNode?: string
  eventServer?: string
}

export interface HdTronPaymentsConfig extends BaseTronPaymentsConfig {
  hdKey: string // xprv or xpub
  maxAddressScan?: number // max address scan to find address index in getAddressIndex
}

export interface KeyPairTronPaymentsConfig extends BaseTronPaymentsConfig {
  keyPairs: Array<string | null | undefined> | { [index: number]: string } // private keys or addresses
}

export type TronPaymentsConfig = HdTronPaymentsConfig | KeyPairTronPaymentsConfig

export type TransactionInfoRaw = TronTransaction & TronTransactionInfo & {
  currentBlock: Pick<TronBlock, 'blockID' | 'block_header'>
}

export interface UnsignedTransaction extends BaseUnsignedTransaction<TronTransaction> {
  id: string
  amount: string
  fee: string
}
export interface SignedTransaction extends BaseSignedTransaction<TronTransaction> {}
export interface TransactionInfo extends BaseTransactionInfo<TransactionInfoRaw> {
  from: string
  to: string
}

export interface CreateTransactionOptions {
  fee?: number // in sun
}

export interface GetAddressOptions {
  cacheIndex?: boolean
}
