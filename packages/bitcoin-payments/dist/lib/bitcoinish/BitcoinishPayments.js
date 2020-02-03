import { FeeOptionCustom, FeeRateType, FeeLevel, Payport, TransactionStatus, } from '@faast/payments-common';
import { isUndefined, isType, toBigNumber } from '@faast/ts-common';
import BigNumber from 'bignumber.js';
import { get } from 'lodash';
import { sortUtxos, estimateTxFee } from './utils';
import { BitcoinishPaymentsUtils } from './BitcoinishPaymentsUtils';
export class BitcoinishPayments extends BitcoinishPaymentsUtils {
    constructor(config) {
        super(config);
        this.coinSymbol = config.coinSymbol;
        this.coinName = config.coinName;
        this.decimals = config.decimals;
        this.bitcoinjsNetwork = config.bitcoinjsNetwork;
        this.minTxFee = config.minTxFee;
        this.dustThreshold = config.dustThreshold;
        this.networkMinRelayFee = config.networkMinRelayFee;
        this.isSegwit = config.isSegwit;
        this.defaultFeeLevel = config.defaultFeeLevel;
    }
    async init() { }
    async destroy() { }
    requiresBalanceMonitor() {
        return false;
    }
    isSweepableBalance(balance) {
        return this.toBaseDenominationNumber(balance) > this.networkMinRelayFee;
    }
    async getPayport(index) {
        return { address: this.getAddress(index) };
    }
    async resolvePayport(payport) {
        if (typeof payport === 'number') {
            return this.getPayport(payport);
        }
        else if (typeof payport === 'string') {
            if (!await this.isValidAddress(payport)) {
                throw new Error(`Invalid BTC address: ${payport}`);
            }
            return { address: payport };
        }
        else if (Payport.is(payport)) {
            if (!await this.isValidAddress(payport.address)) {
                throw new Error(`Invalid BTC payport.address: ${payport.address}`);
            }
            return payport;
        }
        else {
            throw new Error('Invalid payport');
        }
    }
    _feeRateToSatoshis({ feeRate, feeRateType }, inputCount, outputCount) {
        if (feeRateType === FeeRateType.BasePerWeight) {
            return estimateTxFee(Number.parseFloat(feeRate), inputCount, outputCount, this.isSegwit);
        }
        else if (feeRateType === FeeRateType.Main) {
            return this.toBaseDenominationNumber(feeRate);
        }
        return Number.parseFloat(feeRate);
    }
    _calculatTxFeeSatoshis(targetRate, inputCount, outputCount) {
        let feeSat = this._feeRateToSatoshis(targetRate, inputCount, outputCount);
        if (this.minTxFee) {
            const minTxFeeSat = this._feeRateToSatoshis(this.minTxFee, inputCount, outputCount);
            if (feeSat < minTxFeeSat) {
                feeSat = minTxFeeSat;
            }
        }
        if (feeSat < this.networkMinRelayFee) {
            feeSat = this.networkMinRelayFee;
        }
        return Math.ceil(feeSat);
    }
    async resolveFeeOption(feeOption) {
        let targetLevel;
        let target;
        let feeBase = '';
        let feeMain = '';
        if (isType(FeeOptionCustom, feeOption)) {
            targetLevel = FeeLevel.Custom;
            target = feeOption;
        }
        else {
            targetLevel = feeOption.feeLevel || this.defaultFeeLevel;
            target = await this.getFeeRateRecommendation(targetLevel);
        }
        if (target.feeRateType === FeeRateType.Base) {
            feeBase = target.feeRate;
            feeMain = this.toMainDenominationString(feeBase);
        }
        else if (target.feeRateType === FeeRateType.Main) {
            feeMain = target.feeRate;
            feeBase = this.toBaseDenominationString(feeMain);
        }
        return {
            targetFeeLevel: targetLevel,
            targetFeeRate: target.feeRate,
            targetFeeRateType: target.feeRateType,
            feeBase,
            feeMain,
        };
    }
    async getBalance(payport) {
        const { address } = await this.resolvePayport(payport);
        const result = await this._retryDced(() => this.getApi().getAddressDetails(address, { details: 'basic' }));
        const confirmedBalance = this.toMainDenominationString(result.balance);
        const unconfirmedBalance = this.toMainDenominationString(result.unconfirmedBalance);
        this.logger.debug('getBalance', address, confirmedBalance, unconfirmedBalance);
        return {
            confirmedBalance,
            unconfirmedBalance,
            sweepable: this.isSweepableBalance(confirmedBalance)
        };
    }
    usesUtxos() {
        return true;
    }
    async getUtxos(payport) {
        const { address } = await this.resolvePayport(payport);
        let utxosRaw = await this.getApi().getUtxosForAddress(address);
        const utxos = utxosRaw.map((data) => {
            const { value, height, lockTime } = data;
            return {
                ...data,
                satoshis: value,
                value: this.toMainDenominationString(value),
                height: isUndefined(height) ? undefined : String(height),
                lockTime: isUndefined(lockTime) ? undefined : String(lockTime),
            };
        });
        return utxos;
    }
    _sumUtxoValue(utxos) {
        return utxos.reduce((total, { value }) => toBigNumber(value).plus(total), new BigNumber(0));
    }
    usesSequenceNumber() {
        return false;
    }
    async getNextSequenceNumber() {
        return null;
    }
    async resolveFromTo(from, to) {
        const fromPayport = await this.getPayport(from);
        const toPayport = await this.resolvePayport(to);
        return {
            fromAddress: fromPayport.address,
            fromIndex: from,
            fromExtraId: fromPayport.extraId,
            fromPayport,
            toAddress: toPayport.address,
            toIndex: typeof to === 'number' ? to : null,
            toExtraId: toPayport.extraId,
            toPayport,
        };
    }
    async buildPaymentTx(allUtxos, desiredOutputs, changeAddress, desiredFeeRate, useAllUtxos = false) {
        let outputTotal = 0;
        const outputs = desiredOutputs.map(({ address, value }) => ({
            address,
            satoshis: this.toBaseDenominationNumber(value),
        }));
        for (let i = 0; i < outputs.length; i++) {
            const { address, satoshis } = outputs[i];
            if (!await this.isValidAddress(address)) {
                throw new Error(`Invalid ${this.coinSymbol} address ${address} provided for output ${i}`);
            }
            if (satoshis <= 0) {
                throw new Error(`Invalid ${this.coinSymbol} amount ${satoshis} provided for output ${i}`);
            }
            outputTotal += satoshis;
        }
        const outputCount = outputs.length + 1;
        let inputUtxos = [];
        let inputTotal = 0;
        let feeSat = 0;
        let amountWithFee = outputTotal + feeSat;
        if (useAllUtxos) {
            inputUtxos = allUtxos;
            inputTotal = this.toBaseDenominationNumber(this._sumUtxoValue(allUtxos));
            feeSat = this._calculatTxFeeSatoshis(desiredFeeRate, inputUtxos.length, outputCount);
            amountWithFee = outputTotal + feeSat;
            this.logger.debug('buildPaymentTx', { inputTotal, feeSat, amountWithFee });
        }
        else {
            const sortedUtxos = sortUtxos(allUtxos);
            for (const utxo of sortedUtxos) {
                inputUtxos.push(utxo);
                inputTotal = inputTotal + this.toBaseDenominationNumber(utxo.value);
                feeSat = this._calculatTxFeeSatoshis(desiredFeeRate, inputUtxos.length, outputCount);
                amountWithFee = outputTotal + feeSat;
                if (inputTotal >= amountWithFee) {
                    break;
                }
            }
        }
        if (amountWithFee > inputTotal) {
            const amountWithSymbol = `${this.toMainDenominationString(outputTotal)} ${this.coinSymbol}`;
            if (outputTotal === inputTotal) {
                this.logger.debug(`Attempting to send entire ${amountWithSymbol} balance. ` +
                    `Subtracting fee of ${feeSat} sat from first output.`);
                amountWithFee = outputTotal;
                outputs[0].satoshis -= feeSat;
                outputTotal -= feeSat;
                if (outputs[0].satoshis <= this.dustThreshold) {
                    throw new Error(`First ${this.coinSymbol} output minus fee is below dust threshold`);
                }
            }
            else {
                const { feeRate, feeRateType } = desiredFeeRate;
                const feeText = `${feeRate} ${feeRateType}${feeRateType === FeeRateType.BasePerWeight ? ` (${this.toMainDenominationString(feeSat)})` : ''}`;
                throw new Error(`You do not have enough UTXOs (${this.toMainDenominationString(inputTotal)}) to send ${amountWithSymbol} with ${feeText} fee`);
            }
        }
        let changeSat = inputTotal - amountWithFee;
        let change = this.toMainDenominationString(changeSat);
        if (changeSat > this.dustThreshold) {
            outputs.push({ address: changeAddress, satoshis: changeSat });
        }
        else if (changeSat > 0) {
            this.logger.log(`${this.coinSymbol} change of ${changeSat} sat is below dustThreshold of ${this.dustThreshold}, adding to fee`);
            feeSat += changeSat;
            changeSat = 0;
            change = '0';
        }
        return {
            inputs: inputUtxos,
            outputs: outputs.map(({ address, satoshis }) => ({ address, value: this.toMainDenominationString(satoshis) })),
            fee: this.toMainDenominationString(feeSat),
            change,
            changeAddress,
        };
    }
    async createTransaction(from, to, amountNumeric, options = {}) {
        this.logger.debug('createTransaction', from, to, amountNumeric);
        const desiredAmount = toBigNumber(amountNumeric);
        if (desiredAmount.isNaN() || desiredAmount.lte(0)) {
            throw new Error(`Invalid ${this.coinSymbol} amount provided to createTransaction: ${desiredAmount}`);
        }
        const { fromIndex, fromAddress, fromExtraId, toIndex, toAddress, toExtraId, } = await this.resolveFromTo(from, to);
        const allUtxos = isUndefined(options.utxos)
            ? await this.getUtxos(from)
            : options.utxos;
        this.logger.debug('createTransaction allUtxos', allUtxos);
        const { targetFeeLevel, targetFeeRate, targetFeeRateType } = await this.resolveFeeOption(options);
        this.logger.debug(`createTransaction resolvedFeeOption ${targetFeeLevel} ${targetFeeRate} ${targetFeeRateType}`);
        const paymentTx = await this.buildPaymentTx(allUtxos, [{ address: toAddress, value: desiredAmount.toString() }], fromAddress, { feeRate: targetFeeRate, feeRateType: targetFeeRateType }, options.useAllUtxos);
        this.logger.debug('createTransaction data', paymentTx);
        const feeMain = paymentTx.fee;
        const actualAmount = paymentTx.outputs[0].value;
        return {
            status: TransactionStatus.Unsigned,
            id: null,
            fromIndex,
            fromAddress,
            fromExtraId,
            toIndex,
            toAddress,
            toExtraId,
            amount: actualAmount,
            targetFeeLevel,
            targetFeeRate,
            targetFeeRateType,
            fee: feeMain,
            sequenceNumber: null,
            inputUtxos: paymentTx.inputs,
            data: paymentTx,
        };
    }
    async createSweepTransaction(from, to, options = {}) {
        this.logger.debug('createSweepTransaction', from, to, options);
        const allUtxos = isUndefined(options.utxos)
            ? await this.getUtxos(from)
            : options.utxos;
        if (allUtxos.length === 0) {
            throw new Error('No utxos to sweep');
        }
        const amount = this._sumUtxoValue(allUtxos);
        if (!this.isSweepableBalance(amount)) {
            throw new Error(`Balance ${amount} too low to sweep`);
        }
        return this.createTransaction(from, to, amount, {
            ...options,
            utxos: allUtxos,
            useAllUtxos: true,
        });
    }
    async broadcastTransaction(tx) {
        const txId = await this._retryDced(() => this.getApi().sendTx(tx.data.hex));
        if (tx.id !== txId) {
            this.logger.warn(`Broadcasted ${this.coinSymbol} txid ${txId} doesn't match original txid ${tx.id}`);
        }
        return {
            id: txId,
        };
    }
    async getTransactionInfo(txId) {
        const tx = await this._retryDced(() => this.getApi().getTx(txId));
        const fee = this.toMainDenominationString(tx.fees);
        const confirmationId = tx.blockHash || null;
        const confirmationNumber = tx.blockHeight ? String(tx.blockHeight) : undefined;
        const confirmationTimestamp = tx.blockTime ? new Date(tx.blockTime * 1000) : null;
        const isConfirmed = Boolean(confirmationNumber);
        const status = isConfirmed ? TransactionStatus.Confirmed : TransactionStatus.Pending;
        const amountSat = get(tx, 'vout.0.value', tx.value);
        const amount = this.toMainDenominationString(amountSat);
        const fromAddress = get(tx, 'vin.0.addresses.0');
        if (!fromAddress) {
            throw new Error(`Unable to determine fromAddress of ${this.coinSymbol} tx ${txId}`);
        }
        const toAddress = get(tx, 'vout.0.addresses.0');
        if (!toAddress) {
            throw new Error(`Unable to determine toAddress of ${this.coinSymbol} tx ${txId}`);
        }
        return {
            status,
            id: tx.txid,
            fromIndex: null,
            fromAddress,
            fromExtraId: null,
            toIndex: null,
            toAddress,
            toExtraId: null,
            amount,
            fee,
            sequenceNumber: null,
            confirmationId,
            confirmationNumber,
            confirmationTimestamp,
            isExecuted: isConfirmed,
            isConfirmed,
            confirmations: tx.confirmations,
            data: tx,
        };
    }
}
//# sourceMappingURL=BitcoinishPayments.js.map