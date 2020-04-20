import { FeeOptionCustom, FeeRateType, FeeLevel, Payport, TransactionStatus, } from '@faast/payments-common';
import { isUndefined, isType, toBigNumber, assertType, isNumber } from '@faast/ts-common';
import { get } from 'lodash';
import * as t from 'io-ts';
import { PayportOutput, } from './types';
import { estimateTxFee, sumUtxoValue, sortUtxos, isConfirmedUtxo, sha256FromHex } from './utils';
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
        this.defaultFeeLevel = config.defaultFeeLevel;
        this.targetUtxoPoolSize = isUndefined(config.targetUtxoPoolSize) ? 1 : config.targetUtxoPoolSize;
        const minChange = toBigNumber(isUndefined(config.minChange) ? 0 : config.minChange);
        if (minChange.lt(0)) {
            throw new Error(`invalid minChange amount ${config.minChange}, must be positive`);
        }
        this.minChangeSat = this.toBaseDenominationNumber(minChange);
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
                satoshis: Number.parseInt(value),
                value: this.toMainDenominationString(value),
                height: isUndefined(height) ? undefined : String(height),
                lockTime: isUndefined(lockTime) ? undefined : String(lockTime),
            };
        });
        return utxos;
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
    convertOutputsToExternalFormat(outputs) {
        return outputs.map(({ address, satoshis }) => ({ address, value: this.toMainDenominationString(satoshis) }));
    }
    feeRateToSatoshis({ feeRate, feeRateType }, inputCount, outputCount) {
        if (feeRateType === FeeRateType.BasePerWeight) {
            return estimateTxFee(Number.parseFloat(feeRate), inputCount, outputCount, true);
        }
        else if (feeRateType === FeeRateType.Main) {
            return this.toBaseDenominationNumber(feeRate);
        }
        return Number.parseFloat(feeRate);
    }
    calculateTxFeeSatoshis(targetRate, inputCount, outputCount) {
        let feeSat = this.feeRateToSatoshis(targetRate, inputCount, outputCount);
        if (this.minTxFee) {
            const minTxFeeSat = this.feeRateToSatoshis(this.minTxFee, inputCount, outputCount);
            if (feeSat < minTxFeeSat) {
                this.logger.debug(`Using min tx fee of ${minTxFeeSat} sat (${this.minTxFee} sat/byte) instead of ${feeSat} sat`);
                feeSat = minTxFeeSat;
            }
        }
        if (feeSat < this.networkMinRelayFee) {
            this.logger.debug(`Using network min relay fee of ${this.networkMinRelayFee} sat instead of ${feeSat} sat`);
            feeSat = this.networkMinRelayFee;
        }
        return Math.ceil(feeSat);
    }
    selectInputUtxos(availableUtxos, outputTotal, outputCount, feeRate, useAllUtxos) {
        const utxos = [];
        let utxosTotalSat = 0;
        for (const utxo of availableUtxos) {
            const satoshis = isUndefined(utxo.satoshis)
                ? this.toBaseDenominationNumber(utxo.value)
                : toBigNumber(utxo.satoshis).toNumber();
            utxosTotalSat += satoshis;
            utxos.push({
                ...utxo,
                satoshis,
            });
        }
        if (useAllUtxos) {
            return {
                selectedUtxos: utxos,
                selectedTotalSat: utxosTotalSat,
                feeSat: this.calculateTxFeeSatoshis(feeRate, utxos.length, outputCount)
            };
        }
        else {
            const idealSolutionFeeSat = this.calculateTxFeeSatoshis(feeRate, 1, outputCount);
            const idealSolutionMinSat = outputTotal + idealSolutionFeeSat;
            const idealSolutionMaxSat = idealSolutionMinSat + this.dustThreshold;
            for (const utxo of utxos) {
                if (utxo.satoshis >= idealSolutionMinSat && utxo.satoshis <= idealSolutionMaxSat) {
                    this.logger.log(`Found ideal ${this.coinSymbol} input utxo solution to send ${outputTotal} sat using single utxo ${utxo.txid}:${utxo.vout}`);
                    return {
                        selectedUtxos: [utxo],
                        selectedTotalSat: utxo.satoshis,
                        feeSat: idealSolutionFeeSat,
                    };
                }
            }
            let selectedUtxos = [];
            let selectedTotalSat = 0;
            let feeSat = 0;
            const sortedUtxos = sortUtxos(utxos);
            for (const utxo of sortedUtxos) {
                selectedUtxos.push(utxo);
                selectedTotalSat += utxo.satoshis;
                feeSat = this.calculateTxFeeSatoshis(feeRate, selectedUtxos.length, outputCount);
                if (selectedTotalSat >= outputTotal + feeSat) {
                    break;
                }
            }
            return {
                selectedUtxos,
                selectedTotalSat,
                feeSat,
            };
        }
    }
    async buildPaymentTx(params) {
        const { unusedUtxos, desiredOutputs, changeAddress, desiredFeeRate, } = params;
        const useAllUtxos = isUndefined(params.useAllUtxos) ? false : params.useAllUtxos;
        const useUnconfirmedUtxos = isUndefined(params.useUnconfirmedUtxos) ? false : params.useUnconfirmedUtxos;
        const maxOutputCount = desiredOutputs.length + this.targetUtxoPoolSize;
        let outputTotal = 0;
        const externalOutputs = [];
        for (let i = 0; i < desiredOutputs.length; i++) {
            const { address, value } = desiredOutputs[i];
            if (!await this.isValidAddress(address)) {
                throw new Error(`Invalid ${this.coinSymbol} address ${address} provided for output ${i}`);
            }
            const satoshis = this.toBaseDenominationNumber(value);
            if (isNaN(satoshis)) {
                throw new Error(`Invalid ${this.coinSymbol} value (${value}) provided to createMultiOutputTransaction output ${i} (${address})`);
            }
            if (satoshis <= 0) {
                throw new Error(`Invalid ${this.coinSymbol} positive value (${value}) provided for output ${i} (${address})`);
            }
            externalOutputs.push({ address, satoshis });
            outputTotal += satoshis;
        }
        if (!await this.isValidAddress(changeAddress)) {
            throw new Error(`Invalid ${this.coinSymbol} change address ${changeAddress} provided`);
        }
        const availableUtxos = !useUnconfirmedUtxos
            ? unusedUtxos.filter(isConfirmedUtxo)
            : unusedUtxos;
        let { selectedUtxos: inputUtxos, selectedTotalSat: inputTotal, feeSat } = this.selectInputUtxos(availableUtxos, outputTotal, maxOutputCount, desiredFeeRate, useAllUtxos);
        let amountWithFee = outputTotal + feeSat;
        if (amountWithFee > inputTotal) {
            if (outputTotal === inputTotal) {
                const feeShare = Math.ceil(feeSat / externalOutputs.length);
                feeSat = feeShare * externalOutputs.length;
                this.logger.log(`${this.coinSymbol} buildPaymentTx - Attempting to send entire ${outputTotal} sat balance. ` +
                    `Subtracting fee of ${feeSat} sat from ${externalOutputs.length} outputs (${feeShare} sat each)`);
                for (let i = 0; i < externalOutputs.length; i++) {
                    const externalOutput = externalOutputs[i];
                    externalOutput.satoshis -= feeShare;
                    if (externalOutput.satoshis <= this.dustThreshold) {
                        throw new Error(`${this.coinSymbol} buildPaymentTx - output ${i} for ${externalOutput.satoshis} ` +
                            `sat minus ${feeShare} sat fee share is below dust threshold`);
                    }
                }
                amountWithFee = inputTotal;
                outputTotal -= feeSat;
            }
            else {
                throw new Error(`${this.coinSymbol} buildPaymentTx - You do not have enough UTXOs (${inputTotal} sat) ` +
                    `to send ${outputTotal} sat with ${feeSat} sat fee`);
            }
        }
        let totalChangeSat = inputTotal - amountWithFee;
        this.logger.debug('buildPaymentTx', { inputTotal, feeSat, outputTotal, totalChangeSat });
        let changeOutputs = [];
        if (totalChangeSat > this.dustThreshold) {
            const remainingUtxoCount = unusedUtxos.length - inputUtxos.length;
            const targetChangeOutputCount = remainingUtxoCount < this.targetUtxoPoolSize
                ? this.targetUtxoPoolSize - remainingUtxoCount
                : 1;
            const changeOutputWeights = this.createWeightedChangeOutputs(targetChangeOutputCount, changeAddress);
            const totalChangeWeight = changeOutputWeights.reduce((total, { weight }) => total += weight, 0);
            let totalChangeAllocated = 0;
            for (let i = 0; i < changeOutputWeights.length; i++) {
                const { address, weight } = changeOutputWeights[i];
                const changeSat = Math.floor(totalChangeSat * (weight / totalChangeWeight));
                if (changeSat <= this.dustThreshold || changeSat < this.minChangeSat) {
                    this.logger.log(`${this.coinSymbol} buildPaymentTx - desired change output ${i} is below dust threshold or minChange, ` +
                        'will redistribute to other change outputs or add to fee');
                }
                else {
                    changeOutputs.push({ address, satoshis: changeSat });
                    totalChangeAllocated += changeSat;
                }
            }
            this.logger.debug({ changeOutputWeights, totalChangeWeight, totalChangeAllocated, changeOutputs });
            let looseChange = totalChangeSat - totalChangeAllocated;
            if (looseChange < 0) {
                throw new Error(`${this.coinSymbol} buildPaymentTx - looseChange should never be negative!`);
            }
            else if (changeOutputs.length > 0 && looseChange / changeOutputs.length > 1) {
                const extraSatPerChangeOutput = Math.floor(looseChange / changeOutputs.length);
                this.logger.log(`${this.coinSymbol} buildPaymentTx - redistributing looseChange of ${extraSatPerChangeOutput} per change output`);
                for (let i = 0; i < changeOutputs.length; i++) {
                    changeOutputs[i].satoshis += extraSatPerChangeOutput;
                }
                looseChange -= extraSatPerChangeOutput * changeOutputs.length;
            }
            else if (changeOutputs.length === 0 && looseChange > this.dustThreshold) {
                this.logger.log(`${this.coinSymbol} buildPaymentTx - allocated looseChange towards single ${looseChange} sat change output`);
                changeOutputs.push({ address: changeAddress, satoshis: looseChange });
                looseChange = 0;
            }
            feeSat += looseChange;
            totalChangeSat -= looseChange;
        }
        else if (totalChangeSat > 0) {
            this.logger.log(`${this.coinSymbol} buildPaymentTx - change of ${totalChangeSat} sat is below dustThreshold of ${this.dustThreshold}, adding to fee`);
            feeSat += totalChangeSat;
            totalChangeSat = 0;
        }
        else if (totalChangeSat < 0) {
            throw new Error(`${this.coinSymbol} buildPaymentTx - totalChangeSat is negative when building tx, this shouldnt happen!`);
        }
        const externalOutputsResult = this.convertOutputsToExternalFormat(externalOutputs);
        const changeOutputsResult = this.convertOutputsToExternalFormat(changeOutputs);
        const outputsResult = [...externalOutputsResult, ...changeOutputsResult];
        return {
            inputs: inputUtxos,
            outputs: outputsResult,
            fee: this.toMainDenominationString(feeSat),
            change: this.toMainDenominationString(totalChangeSat),
            changeAddress: changeOutputs.length === 1 ? changeOutputs[0].address : null,
            changeOutputs: changeOutputsResult,
            externalOutputs: externalOutputsResult,
            externalOutputTotal: this.toMainDenominationString(outputTotal),
            rawHex: '',
            rawHash: '',
        };
    }
    createWeightedChangeOutputs(changeOutputCount, changeAddress) {
        const result = [];
        for (let i = 0; i < changeOutputCount; i++) {
            result.push({ address: changeAddress, weight: 2 ** i });
        }
        return result;
    }
    async createTransaction(from, to, amount, options) {
        return this.createMultiOutputTransaction(from, [{ payport: to, amount }], options);
    }
    async createMultiOutputTransaction(from, to, options = {}) {
        assertType(t.array(PayportOutput), to);
        this.logger.debug('createMultiOutputTransaction', from, to, options);
        const unusedUtxos = options.utxos || await this.getUtxos(from);
        this.logger.debug('createMultiOutputTransaction unusedUtxos', unusedUtxos);
        const { address: fromAddress } = await this.resolvePayport(from);
        const desiredOutputs = await Promise.all(to.map(async ({ payport, amount }) => ({
            address: (await this.resolvePayport(payport)).address,
            value: String(amount),
        })));
        const { targetFeeLevel, targetFeeRate, targetFeeRateType } = await this.resolveFeeOption(options);
        this.logger.debug(`createMultiOutputTransaction resolvedFeeOption ${targetFeeLevel} ${targetFeeRate} ${targetFeeRateType}`);
        const paymentTx = await this.buildPaymentTx({
            unusedUtxos,
            desiredOutputs,
            changeAddress: fromAddress,
            desiredFeeRate: { feeRate: targetFeeRate, feeRateType: targetFeeRateType },
            useAllUtxos: options.useAllUtxos,
            useUnconfirmedUtxos: options.useUnconfirmedUtxos,
        });
        const unsignedTxHex = await this.serializePaymentTx(paymentTx, from);
        paymentTx.rawHex = unsignedTxHex;
        paymentTx.rawHash = sha256FromHex(unsignedTxHex);
        this.logger.debug('createMultiOutputTransaction data', paymentTx);
        const feeMain = paymentTx.fee;
        let resultToAddress = 'batch';
        let resultToIndex = null;
        if (paymentTx.externalOutputs.length === 1) {
            const onlyOutput = paymentTx.externalOutputs[0];
            resultToAddress = onlyOutput.address;
            resultToIndex = isNumber(to[0].payport) ? to[0].payport : null;
        }
        return {
            status: TransactionStatus.Unsigned,
            id: null,
            fromIndex: from,
            fromAddress,
            fromExtraId: null,
            toIndex: resultToIndex,
            toAddress: resultToAddress,
            toExtraId: null,
            amount: paymentTx.externalOutputTotal,
            targetFeeLevel,
            targetFeeRate,
            targetFeeRateType,
            fee: feeMain,
            sequenceNumber: null,
            inputUtxos: paymentTx.inputs,
            externalOutputs: paymentTx.externalOutputs,
            data: paymentTx,
        };
    }
    async createSweepTransaction(from, to, options = {}) {
        this.logger.debug('createSweepTransaction', from, to, options);
        const availableUtxos = isUndefined(options.utxos)
            ? await this.getUtxos(from)
            : options.utxos;
        if (availableUtxos.length === 0) {
            throw new Error('No available utxos to sweep');
        }
        const outputAmount = sumUtxoValue(availableUtxos, options.useUnconfirmedUtxos);
        if (!this.isSweepableBalance(outputAmount)) {
            throw new Error(`Available utxo total ${outputAmount} ${this.coinSymbol} too low to sweep`);
        }
        const updatedOptions = {
            useUnconfirmedUtxos: true,
            ...options,
            utxos: availableUtxos,
            useAllUtxos: true,
        };
        return this.createTransaction(from, to, outputAmount, updatedOptions);
    }
    async broadcastTransaction(tx) {
        let txId;
        try {
            txId = await this._retryDced(() => this.getApi().sendTx(tx.data.hex));
            if (tx.id !== txId) {
                this.logger.warn(`Broadcasted ${this.coinSymbol} txid ${txId} doesn't match original txid ${tx.id}`);
            }
        }
        catch (e) {
            const message = e.message || '';
            if (message.startsWith('-27')) {
                txId = tx.id;
            }
            else {
                throw e;
            }
        }
        return {
            id: tx.id,
        };
    }
    async getTransactionInfo(txId) {
        const tx = await this._retryDced(() => this.getApi().getTx(txId));
        const fee = this.toMainDenominationString(tx.fees);
        const confirmationId = tx.blockHash || null;
        const confirmationNumber = tx.blockHeight ? String(tx.blockHeight) : undefined;
        const confirmationTimestamp = tx.blockTime ? new Date(tx.blockTime * 1000) : null;
        const isConfirmed = Boolean(tx.confirmations && tx.confirmations > 0);
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