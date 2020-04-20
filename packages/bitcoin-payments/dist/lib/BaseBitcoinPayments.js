import * as bitcoin from 'bitcoinjs-lib';
import { FeeRateType, TransactionStatus } from '@faast/payments-common';
import { getBlockcypherFeeEstimate, toBitcoinishConfig } from './utils';
import { BitcoinSignedTransactionData, } from './types';
import { DEFAULT_SAT_PER_BYTE_LEVELS, BITCOIN_SEQUENCE_RBF, } from './constants';
import { isValidAddress, isValidPrivateKey, isValidPublicKey } from './helpers';
import { BitcoinishPayments } from './bitcoinish';
export class BaseBitcoinPayments extends BitcoinishPayments {
    constructor(config) {
        super(toBitcoinishConfig(config));
        this.maximumFeeRate = config.maximumFeeRate;
    }
    isValidAddress(address) {
        return isValidAddress(address, this.bitcoinjsNetwork);
    }
    isValidPrivateKey(privateKey) {
        return isValidPrivateKey(privateKey, this.bitcoinjsNetwork);
    }
    isValidPublicKey(publicKey) {
        return isValidPublicKey(publicKey, this.bitcoinjsNetwork);
    }
    async getFeeRateRecommendation(feeLevel) {
        let satPerByte;
        try {
            satPerByte = await getBlockcypherFeeEstimate(feeLevel, this.networkType);
        }
        catch (e) {
            satPerByte = DEFAULT_SAT_PER_BYTE_LEVELS[feeLevel];
            this.logger.warn(`Failed to get bitcoin ${this.networkType} fee estimate, using hardcoded default of ${feeLevel} sat/byte -- ${e.message}`);
        }
        return {
            feeRate: satPerByte.toString(),
            feeRateType: FeeRateType.BasePerWeight,
        };
    }
    async getPsbtInputData(utxo, paymentScript, addressType) {
        const utx = await this.getApi().getTx(utxo.txid);
        const result = {
            hash: utxo.txid,
            index: utxo.vout,
            sequence: BITCOIN_SEQUENCE_RBF,
        };
        if ((/p2wpkh|p2wsh/).test(addressType)) {
            const rawUtxo = utx.vout[utxo.vout];
            const { hex: scriptPubKey, value: rawValue } = rawUtxo;
            if (!scriptPubKey) {
                throw new Error(`Cannot get scriptPubKey for utxo ${utxo.txid}:${utxo.vout}`);
            }
            const utxoValue = this.toBaseDenominationNumber(utxo.value);
            if (String(utxoValue) !== rawValue) {
                throw new Error(`Utxo ${utxo.txid}:${utxo.vout} has mismatched value - ${utxoValue} sat expected but network reports ${rawValue} sat`);
            }
            result.witnessUtxo = {
                script: Buffer.from(scriptPubKey, 'hex'),
                value: utxoValue,
            };
        }
        else {
            if (!utx.hex) {
                throw new Error(`Cannot get raw hex of tx for utxo ${utxo.txid}:${utxo.vout}`);
            }
            result.nonWitnessUtxo = Buffer.from(utx.hex, 'hex');
        }
        if (addressType.startsWith('p2sh-p2wsh')) {
            result.witnessScript = paymentScript.redeem.redeem.output;
            result.redeemScript = paymentScript.redeem.output;
        }
        else if (addressType.startsWith('p2sh')) {
            result.redeemScript = paymentScript.redeem.output;
        }
        else if (addressType.startsWith('p2wsh')) {
            result.witnessScript = paymentScript.redeem.output;
        }
        return result;
    }
    get psbtOptions() {
        return {
            network: this.bitcoinjsNetwork,
            maximumFeeRate: this.maximumFeeRate,
        };
    }
    async buildPsbt(paymentTx, fromIndex) {
        const { inputs, outputs } = paymentTx;
        const inputPaymentScript = this.getPaymentScript(fromIndex);
        let psbt = new bitcoin.Psbt(this.psbtOptions);
        for (let input of inputs) {
            psbt.addInput(await this.getPsbtInputData(input, inputPaymentScript, this.addressType));
        }
        for (let output of outputs) {
            psbt.addOutput({
                address: output.address,
                value: this.toBaseDenominationNumber(output.value)
            });
        }
        return psbt;
    }
    async serializePaymentTx(tx, fromIndex) {
        return (await this.buildPsbt(tx, fromIndex)).toHex();
    }
    validateAndFinalizeSignedTx(tx, psbt) {
        if (!psbt.validateSignaturesOfAllInputs()) {
            throw new Error('Failed to validate signatures of all inputs');
        }
        psbt.finalizeAllInputs();
        const signedTx = psbt.extractTransaction();
        const txId = signedTx.getId();
        const txHex = signedTx.toHex();
        const txData = tx.data;
        const unsignedTxHash = BitcoinSignedTransactionData.is(txData) ? txData.unsignedTxHash : txData.rawHash;
        return {
            ...tx,
            status: TransactionStatus.Signed,
            id: txId,
            data: {
                hex: txHex,
                partial: false,
                unsignedTxHash,
            },
        };
    }
}
//# sourceMappingURL=BaseBitcoinPayments.js.map