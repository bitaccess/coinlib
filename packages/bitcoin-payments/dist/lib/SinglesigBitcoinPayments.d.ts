import * as bitcoin from 'bitcoinjs-lib';
import { BitcoinjsKeyPair, BitcoinUnsignedTransaction, BitcoinSignedTransaction, SinglesigBitcoinPaymentsConfig, SinglesigAddressType } from './types';
import { BaseBitcoinPayments } from './BaseBitcoinPayments';
export declare abstract class SinglesigBitcoinPayments<Config extends SinglesigBitcoinPaymentsConfig> extends BaseBitcoinPayments<Config> {
    addressType: SinglesigAddressType;
    constructor(config: SinglesigBitcoinPaymentsConfig);
    abstract getKeyPair(index: number): BitcoinjsKeyPair;
    getPaymentScript(index: number): bitcoin.payments.Payment;
    signMultisigTransaction(tx: BitcoinUnsignedTransaction): BitcoinSignedTransaction;
    signTransaction(tx: BitcoinUnsignedTransaction): Promise<BitcoinSignedTransaction>;
}
