import * as bitcoin from 'bitcoinjs-lib';
import { FeeRate, AutoFeeLevels, UtxoInfo } from '@faast/payments-common';
import { BaseBitcoinPaymentsConfig, BitcoinUnsignedTransaction, BitcoinSignedTransaction, AddressType, PsbtInputData } from './types';
import { BitcoinishPayments, BitcoinishPaymentTx } from './bitcoinish';
export declare abstract class BaseBitcoinPayments<Config extends BaseBitcoinPaymentsConfig> extends BitcoinishPayments<Config> {
    readonly maximumFeeRate?: number;
    constructor(config: BaseBitcoinPaymentsConfig);
    abstract getPaymentScript(index: number): bitcoin.payments.Payment;
    abstract addressType: AddressType;
    isValidAddress(address: string): boolean;
    isValidPrivateKey(privateKey: string): boolean;
    isValidPublicKey(publicKey: string): boolean;
    getFeeRateRecommendation(feeLevel: AutoFeeLevels): Promise<FeeRate>;
    getPsbtInputData(utxo: UtxoInfo, paymentScript: bitcoin.payments.Payment, addressType: AddressType): Promise<PsbtInputData>;
    get psbtOptions(): {
        network: bitcoin.networks.Network;
        maximumFeeRate: number | undefined;
    };
    buildPsbt(paymentTx: BitcoinishPaymentTx, fromIndex: number): Promise<bitcoin.Psbt>;
    serializePaymentTx(tx: BitcoinishPaymentTx, fromIndex: number): Promise<string>;
    validateAndFinalizeSignedTx(tx: BitcoinSignedTransaction | BitcoinUnsignedTransaction, psbt: bitcoin.Psbt): BitcoinSignedTransaction;
    updateMultisigTx(tx: BitcoinSignedTransaction | BitcoinUnsignedTransaction, psbt: bitcoin.Psbt, signedAccountIds: string[]): BitcoinSignedTransaction;
}
