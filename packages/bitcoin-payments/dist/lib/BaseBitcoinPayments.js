import { payments as bjsPayments, TransactionBuilder } from 'bitcoinjs-lib';
import { FeeRateType, TransactionStatus } from '@faast/payments-common';
import { getBlockcypherFeeEstimate, toBitcoinishConfig } from './utils';
import { AddressType, } from './types';
import { DEFAULT_SAT_PER_BYTE_LEVELS, DEFAULT_ADDRESS_TYPE, BITCOIN_SEQUENCE_RBF, } from './constants';
import { toBaseDenominationNumber, isValidAddress } from './helpers';
import { BitcoinishPayments } from './bitcoinish';
export class BaseBitcoinPayments extends BitcoinishPayments {
    constructor(config) {
        super(toBitcoinishConfig(config));
        this.addressType = config.addressType || DEFAULT_ADDRESS_TYPE;
    }
    async isValidAddress(address) {
        return isValidAddress(address, this.bitcoinjsNetwork);
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
    async signTransaction(tx) {
        const keyPair = this.getKeyPair(tx.fromIndex);
        const { inputs, outputs } = tx.data;
        let redeemScript = undefined;
        let prevOutScript = undefined;
        if (this.addressType === AddressType.SegwitP2SH) {
            redeemScript = bjsPayments.p2wpkh({ pubkey: keyPair.publicKey }).output;
        }
        else if (this.addressType === AddressType.SegwitNative) {
            prevOutScript = bjsPayments.p2wpkh({ pubkey: keyPair.publicKey }).output;
        }
        let builder = new TransactionBuilder(this.bitcoinjsNetwork);
        for (let output of outputs) {
            builder.addOutput(output.address, toBaseDenominationNumber(output.value));
        }
        for (let i = 0; i < inputs.length; i++) {
            const input = inputs[i];
            builder.addInput(input.txid, input.vout, BITCOIN_SEQUENCE_RBF, prevOutScript);
        }
        for (let i = 0; i < inputs.length; i++) {
            const input = inputs[i];
            builder.sign(i, keyPair, redeemScript, undefined, toBaseDenominationNumber(input.value));
        }
        const built = builder.build();
        const txId = built.getId();
        const txHex = built.toHex();
        return {
            ...tx,
            status: TransactionStatus.Signed,
            id: txId,
            data: {
                hex: txHex,
            },
        };
    }
}
//# sourceMappingURL=BaseBitcoinPayments.js.map