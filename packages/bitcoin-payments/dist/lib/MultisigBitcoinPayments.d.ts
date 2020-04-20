/// <reference types="node" />
import { BaseBitcoinPayments } from './BaseBitcoinPayments';
import { MultisigBitcoinPaymentsConfig, BitcoinUnsignedTransaction, BitcoinSignedTransaction, PayportOutput, MultisigAddressType } from './types';
import { HdBitcoinPayments } from './HdBitcoinPayments';
import { KeyPairBitcoinPayments } from './KeyPairBitcoinPayments';
import * as bitcoin from 'bitcoinjs-lib';
import { CreateTransactionOptions, ResolveablePayport } from '@faast/payments-common';
import { Numeric } from '@faast/ts-common';
export declare class MultisigBitcoinPayments extends BaseBitcoinPayments<MultisigBitcoinPaymentsConfig> {
    private config;
    addressType: MultisigAddressType;
    m: number;
    signers: (HdBitcoinPayments | KeyPairBitcoinPayments)[];
    constructor(config: MultisigBitcoinPaymentsConfig);
    getFullConfig(): MultisigBitcoinPaymentsConfig;
    getPublicConfig(): MultisigBitcoinPaymentsConfig;
    getAccountId(index: number): string;
    getAccountIds(index?: number): string[];
    getSignerPublicKeyBuffers(index: number): Buffer[];
    getPaymentScript(index: number): bitcoin.payments.Payment;
    getAddress(index: number): string;
    private getMultisigData;
    createTransaction(from: number, to: ResolveablePayport, amount: Numeric, options?: CreateTransactionOptions): Promise<BitcoinUnsignedTransaction>;
    createMultiOutputTransaction(from: number, to: PayportOutput[], options?: CreateTransactionOptions): Promise<BitcoinUnsignedTransaction>;
    createSweepTransaction(from: number, to: ResolveablePayport, options?: CreateTransactionOptions): Promise<BitcoinUnsignedTransaction>;
    private deserializeSignedTxPsbt;
    private getPublicKeysOfSigned;
    private setMultisigSignersAsSigned;
    combinePartiallySignedTransactions(txs: BitcoinSignedTransaction[]): Promise<BitcoinSignedTransaction>;
    signTransaction(tx: BitcoinUnsignedTransaction): Promise<BitcoinSignedTransaction>;
}
export default MultisigBitcoinPayments;
