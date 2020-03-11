import { networks, address, payments, ECPair, TransactionBuilder } from 'bitcoinjs-lib';
import { NetworkTypeT, UtxoInfo, BaseUnsignedTransaction, BaseSignedTransaction, BaseTransactionInfo, BaseBroadcastResult, ResolveablePayport, createUnitConverters, Payport, FeeOptionCustom, FeeLevel, FeeRateType, TransactionStatus, BaseConfig, FeeRate, NetworkType } from '@faast/payments-common';
export { UtxoInfo } from '@faast/payments-common';
import request from 'request-promise-native';
import bs58 from 'bs58';
import { union, string, array, null as null$1, type, number } from 'io-ts';
import { instanceofCodec, requiredOptionalCodec, nullable, Logger, extendCodec, Numeric, isMatchingError, toBigNumber, isString, assertType, DelegateLogger, isNil, isUndefined, isType, isNumber, enumCodec } from '@faast/ts-common';
import { BlockbookBitcoin, BlockInfoBitcoin } from 'blockbook-client';
import { get, omit } from 'lodash';
import promiseRetry from 'promise-retry';
import { fromBase58 } from 'bip32';

class BlockbookServerAPI extends BlockbookBitcoin {
}
const BlockbookConfigServer = union([
    string,
    array(string),
    instanceofCodec(BlockbookServerAPI),
    null$1,
], 'BlockbookConfigServer');
const BlockbookConnectedConfig = requiredOptionalCodec({
    network: NetworkTypeT,
    server: BlockbookConfigServer,
}, {
    logger: nullable(Logger),
}, 'BlockbookConnectedConfig');
const BitcoinishTxOutput = type({
    address: string,
    value: string,
}, 'BitcoinishTxOutput');
const BitcoinishWeightedChangeOutput = type({
    address: string,
    weight: number,
}, 'BitcoinishWeightedChangeOutput');
const BitcoinishPaymentTx = requiredOptionalCodec({
    inputs: array(UtxoInfo),
    outputs: array(BitcoinishTxOutput),
    fee: string,
    change: string,
    changeAddress: nullable(string),
}, {
    externalOutputs: array(BitcoinishTxOutput),
    externalOutputTotal: string,
    changeOutputs: array(BitcoinishTxOutput),
}, 'BitcoinishPaymentTx');
const BitcoinishUnsignedTransaction = extendCodec(BaseUnsignedTransaction, {
    amount: string,
    fee: string,
}, 'BitcoinishUnsignedTransaction');
const BitcoinishSignedTransaction = extendCodec(BaseSignedTransaction, {
    data: type({
        hex: string,
    }),
}, {}, 'BitcoinishSignedTransaction');
const BitcoinishTransactionInfo = extendCodec(BaseTransactionInfo, {}, {}, 'BitcoinishTransactionInfo');
const BitcoinishBroadcastResult = extendCodec(BaseBroadcastResult, {}, {}, 'BitcoinishBroadcastResult');
const BitcoinishBlock = BlockInfoBitcoin;
const PayportOutput = type({
    payport: ResolveablePayport,
    amount: Numeric,
}, 'PayportOutput');

function resolveServer(server, network) {
    if (isString(server)) {
        return {
            api: new BlockbookBitcoin({
                nodes: [server],
            }),
            server: [server],
        };
    }
    else if (server instanceof BlockbookBitcoin) {
        return {
            api: server,
            server: server.nodes,
        };
    }
    else if (Array.isArray(server)) {
        return {
            api: new BlockbookBitcoin({
                nodes: server,
            }),
            server,
        };
    }
    else {
        return {
            api: new BlockbookBitcoin({
                nodes: [''],
            }),
            server: null,
        };
    }
}
const RETRYABLE_ERRORS = ['timeout', 'disconnected'];
const MAX_RETRIES = 3;
function retryIfDisconnected(fn, api, logger) {
    return promiseRetry((retry, attempt) => {
        return fn().catch(async (e) => {
            if (isMatchingError(e, RETRYABLE_ERRORS)) {
                logger.log(`Retryable error during blockbook server call, retrying ${MAX_RETRIES - attempt} more times`, e.toString());
                retry(e);
            }
            throw e;
        });
    }, {
        retries: MAX_RETRIES,
    });
}
function estimateTxSize(inputsCount, outputsCount, handleSegwit) {
    let maxNoWitness;
    let maxSize;
    let maxWitness;
    let minNoWitness;
    let minSize;
    let minWitness;
    let varintLength;
    if (inputsCount < 0xfd) {
        varintLength = 1;
    }
    else if (inputsCount < 0xffff) {
        varintLength = 3;
    }
    else {
        varintLength = 5;
    }
    if (handleSegwit) {
        minNoWitness =
            varintLength + 4 + 2 + 59 * inputsCount + 1 + 31 * outputsCount + 4;
        maxNoWitness =
            varintLength + 4 + 2 + 59 * inputsCount + 1 + 33 * outputsCount + 4;
        minWitness =
            varintLength +
                4 +
                2 +
                59 * inputsCount +
                1 +
                31 * outputsCount +
                4 +
                106 * inputsCount;
        maxWitness =
            varintLength +
                4 +
                2 +
                59 * inputsCount +
                1 +
                33 * outputsCount +
                4 +
                108 * inputsCount;
        minSize = (minNoWitness * 3 + minWitness) / 4;
        maxSize = (maxNoWitness * 3 + maxWitness) / 4;
    }
    else {
        minSize = varintLength + 4 + 146 * inputsCount + 1 + 31 * outputsCount + 4;
        maxSize = varintLength + 4 + 148 * inputsCount + 1 + 33 * outputsCount + 4;
    }
    return {
        min: minSize,
        max: maxSize
    };
}
function estimateTxFee(satPerByte, inputsCount, outputsCount, handleSegwit) {
    const { min, max } = estimateTxSize(inputsCount, outputsCount, handleSegwit);
    const mean = Math.ceil((min + max) / 2);
    return mean * satPerByte;
}
function sumUtxoValue(utxos) {
    return utxos.reduce((total, { value }) => total.plus(value), toBigNumber(0));
}
function sortUtxos(utxoList) {
    const result = [...utxoList];
    result.sort((a, b) => toBigNumber(a.value).minus(b.value).toNumber());
    return result;
}
function isConfirmedUtxo(utxo) {
    return Boolean(utxo.confirmations || utxo.height);
}

class BlockbookConnected {
    constructor(config) {
        assertType(BlockbookConnectedConfig, config);
        this.networkType = config.network;
        this.logger = new DelegateLogger(config.logger);
        const { api, server } = resolveServer(config.server, this.networkType);
        this.api = api;
        this.server = server;
    }
    getApi() {
        if (this.api === null) {
            throw new Error('Cannot access Bitcoin network when configured with null server');
        }
        return this.api;
    }
    async init() { }
    async destroy() { }
    async _retryDced(fn) {
        return retryIfDisconnected(fn, this.getApi(), this.logger);
    }
}

class BitcoinishPaymentsUtils extends BlockbookConnected {
    constructor(config) {
        super(config);
        this.decimals = config.decimals;
        this.bitcoinjsNetwork = config.bitcoinjsNetwork;
        const unitConverters = createUnitConverters(this.decimals);
        this.toMainDenominationString = unitConverters.toMainDenominationString;
        this.toMainDenominationNumber = unitConverters.toMainDenominationNumber;
        this.toMainDenominationBigNumber = unitConverters.toMainDenominationBigNumber;
        this.toBaseDenominationString = unitConverters.toBaseDenominationString;
        this.toBaseDenominationNumber = unitConverters.toBaseDenominationNumber;
        this.toBaseDenominationBigNumber = unitConverters.toBaseDenominationBigNumber;
    }
    async isValidExtraId(extraId) {
        return false;
    }
    async _getPayportValidationMessage(payport) {
        const { address, extraId } = payport;
        if (!await this.isValidAddress(address)) {
            return 'Invalid payport address';
        }
        if (!isNil(extraId)) {
            return 'Invalid payport extraId';
        }
    }
    async getPayportValidationMessage(payport) {
        try {
            payport = assertType(Payport, payport, 'payport');
        }
        catch (e) {
            return e.message;
        }
        return this._getPayportValidationMessage(payport);
    }
    async validatePayport(payport) {
        payport = assertType(Payport, payport, 'payport');
        const message = await this._getPayportValidationMessage(payport);
        if (message) {
            throw new Error(message);
        }
    }
    async isValidPayport(payport) {
        return Payport.is(payport) && !(await this._getPayportValidationMessage(payport));
    }
    toMainDenomination(amount) {
        return this.toMainDenominationString(amount);
    }
    toBaseDenomination(amount) {
        return this.toBaseDenominationString(amount);
    }
    async getBlock(id) {
        if (isUndefined(id)) {
            id = (await this.getApi().getStatus()).backend.bestBlockHash;
        }
        return this.getApi().getBlock(id);
    }
}

class BitcoinishPayments extends BitcoinishPaymentsUtils {
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
            return estimateTxFee(Number.parseFloat(feeRate), inputCount, outputCount, this.isSegwit);
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
                feeSat = minTxFeeSat;
            }
        }
        if (feeSat < this.networkMinRelayFee) {
            feeSat = this.networkMinRelayFee;
        }
        return Math.ceil(feeSat);
    }
    selectInputUtxos(availableUtxos, outputTotal, outputCount, feeRate, useAllUtxos) {
        const utxos = [];
        let utxosTotalSat = 0;
        for (const utxo of availableUtxos) {
            const satoshis = Math.floor(utxo.satoshis || this.toBaseDenominationNumber(utxo.value));
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
        return {
            inputs: inputUtxos,
            outputs: [...externalOutputsResult, ...changeOutputsResult],
            fee: this.toMainDenominationString(feeSat),
            change: this.toMainDenominationString(totalChangeSat),
            changeAddress: changeOutputs.length === 1 ? changeOutputs[0].address : null,
            changeOutputs: changeOutputsResult,
            externalOutputs: externalOutputsResult,
            externalOutputTotal: this.toMainDenominationString(outputTotal),
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
        assertType(array(PayportOutput), to);
        this.logger.debug('createMultiOutputTransaction', from, to, options);
        const unusedUtxos = options.utxos || await this.getUtxos(from);
        this.logger.debug('createMultiOutputTransaction unusedUtxos', unusedUtxos);
        const { address: fromAddress } = await this.resolvePayport(from);
        const desiredOutputs = await Promise.all(to.map(async ({ payport, amount }) => ({
            address: (await this.resolvePayport(payport)).address,
            value: String(amount),
        })));
        const { targetFeeLevel, targetFeeRate, targetFeeRateType } = await this.resolveFeeOption(options);
        this.logger.debug(`createTransaction resolvedFeeOption ${targetFeeLevel} ${targetFeeRate} ${targetFeeRateType}`);
        const paymentTx = await this.buildPaymentTx({
            unusedUtxos,
            desiredOutputs,
            changeAddress: fromAddress,
            desiredFeeRate: { feeRate: targetFeeRate, feeRateType: targetFeeRateType },
            useAllUtxos: options.useAllUtxos,
        });
        this.logger.debug('createTransaction data', paymentTx);
        const feeMain = paymentTx.fee;
        let resultToAddress = 'multi';
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
        const outputAmount = sumUtxoValue(availableUtxos);
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

var AddressType;
(function (AddressType) {
    AddressType["Legacy"] = "p2pkh";
    AddressType["SegwitP2SH"] = "p2sh-p2wpkh";
    AddressType["SegwitNative"] = "p2wpkh";
})(AddressType || (AddressType = {}));
const AddressTypeT = enumCodec(AddressType, 'AddressType');
const BitcoinPaymentsUtilsConfig = extendCodec(BaseConfig, {}, {
    server: BlockbookConfigServer,
}, 'BitcoinPaymentsUtilsConfig');
const BaseBitcoinPaymentsConfig = extendCodec(BitcoinPaymentsUtilsConfig, {}, {
    addressType: AddressTypeT,
    minTxFee: FeeRate,
    dustThreshold: number,
    networkMinRelayFee: number,
    targetUtxoPoolSize: number,
    minChange: string,
}, 'BaseBitcoinPaymentsConfig');
const HdBitcoinPaymentsConfig = extendCodec(BaseBitcoinPaymentsConfig, {
    hdKey: string,
}, {
    derivationPath: string,
}, 'HdBitcoinPaymentsConfig');
const BitcoinPaymentsConfig = HdBitcoinPaymentsConfig;
const BitcoinUnsignedTransactionData = BitcoinishPaymentTx;
const BitcoinUnsignedTransaction = extendCodec(BaseUnsignedTransaction, {
    amount: string,
    fee: string,
    data: BitcoinUnsignedTransactionData,
}, 'BitcoinUnsignedTransaction');
const BitcoinSignedTransaction = extendCodec(BaseSignedTransaction, {
    data: type({
        hex: string,
    }),
}, {}, 'BitcoinSignedTransaction');
const BitcoinTransactionInfo = extendCodec(BaseTransactionInfo, {}, {}, 'BitcoinTransactionInfo');
const BitcoinBroadcastResult = extendCodec(BaseBroadcastResult, {}, {}, 'BitcoinBroadcastResult');
const BitcoinBlock = BlockInfoBitcoin;

const PACKAGE_NAME = 'bitcoin-payments';
const DECIMAL_PLACES = 8;
const COIN_SYMBOL = 'BTC';
const COIN_NAME = 'Bitcoin';
const DEFAULT_DUST_THRESHOLD = 546;
const DEFAULT_NETWORK_MIN_RELAY_FEE = 1000;
const DEFAULT_MIN_TX_FEE = 5;
const DEFAULT_ADDRESS_TYPE = AddressType.SegwitNative;
const DEFAULT_DERIVATION_PATHS = {
    [AddressType.Legacy]: "m/44'/0'/0'",
    [AddressType.SegwitP2SH]: "m/49'/0'/0'",
    [AddressType.SegwitNative]: "m/84'/0'/0'",
};
const DEFAULT_NETWORK = NetworkType.Mainnet;
const NETWORK_MAINNET = networks.bitcoin;
const NETWORK_TESTNET = networks.testnet;
const DEFAULT_MAINNET_SERVER = process.env.BITCOIN_SERVER_URL
    ? process.env.BITCOIN_SERVER_URL.split(',')
    : ['https://btc1.trezor.io', 'https://btc2.trezor.io'];
const DEFAULT_TESTNET_SERVER = process.env.BITCOIN_TESTNET_SERVER_URL
    ? process.env.BITCOIN_TESTNET_SERVER_URL.split(',')
    : ['https://tbtc1.trezor.io', 'https://tbtc2.trezor.io'];
const DEFAULT_FEE_LEVEL = FeeLevel.Medium;
const DEFAULT_SAT_PER_BYTE_LEVELS = {
    [FeeLevel.High]: 50,
    [FeeLevel.Medium]: 25,
    [FeeLevel.Low]: 10,
};

const DEFAULT_BITCOINISH_CONFIG = {
    coinSymbol: COIN_SYMBOL,
    coinName: COIN_NAME,
    decimals: DECIMAL_PLACES,
    dustThreshold: DEFAULT_DUST_THRESHOLD,
    networkMinRelayFee: DEFAULT_NETWORK_MIN_RELAY_FEE,
    minTxFee: {
        feeRate: DEFAULT_MIN_TX_FEE.toString(),
        feeRateType: FeeRateType.BasePerWeight,
    },
    defaultFeeLevel: DEFAULT_FEE_LEVEL,
};
function bip32MagicNumberToPrefix(magicNum) {
    const b = Buffer.alloc(82);
    b.writeUInt32BE(magicNum, 0);
    return bs58.encode(b).slice(0, 4);
}
function toBitcoinishConfig(config) {
    const configWithDefaults = {
        ...DEFAULT_BITCOINISH_CONFIG,
        ...config,
        network: config.network || DEFAULT_NETWORK,
        addressType: config.addressType || DEFAULT_ADDRESS_TYPE,
    };
    const { network, server, addressType } = configWithDefaults;
    return {
        ...configWithDefaults,
        bitcoinjsNetwork: network === NetworkType.Testnet ? NETWORK_TESTNET : NETWORK_MAINNET,
        isSegwit: addressType === AddressType.SegwitNative || addressType === AddressType.SegwitP2SH,
        server: typeof server !== 'undefined'
            ? server
            : (network === NetworkType.Testnet
                ? DEFAULT_TESTNET_SERVER
                : DEFAULT_MAINNET_SERVER),
    };
}
async function getBlockcypherFeeEstimate(feeLevel, networkType) {
    const body = await request.get(`https://api.blockcypher.com/v1/btc/${networkType === NetworkType.Mainnet ? 'main' : 'test3'}`, { json: true });
    const feePerKbField = `${feeLevel}_fee_per_kb`;
    const feePerKb = body[feePerKbField];
    if (!feePerKb) {
        throw new Error(`Blockcypher response is missing expected field ${feePerKbField}`);
    }
    return feePerKb / 1000;
}

const { toMainDenominationBigNumber, toMainDenominationString, toMainDenominationNumber, toBaseDenominationBigNumber, toBaseDenominationString, toBaseDenominationNumber, } = createUnitConverters(DECIMAL_PLACES);
function isValidXprv(xprv, network) {
    try {
        return !fromBase58(xprv, network).isNeutered();
    }
    catch (e) {
        return false;
    }
}
function isValidXpub(xpub, network) {
    try {
        return fromBase58(xpub, network).isNeutered();
    }
    catch (e) {
        return false;
    }
}
function validateHdKey(hdKey, network) {
    try {
        fromBase58(hdKey, network);
    }
    catch (e) {
        return e.toString();
    }
}
function isValidAddress(address$1, network) {
    try {
        address.toOutputScript(address$1, network);
        return true;
    }
    catch (e) {
        return false;
    }
}
function isValidExtraId(extraId) {
    return false;
}
function publicKeyToAddress(publicKey, network, addressType) {
    let script;
    if (addressType === AddressType.Legacy) {
        script = payments.p2pkh({ network, pubkey: publicKey });
    }
    else {
        script = payments.p2wpkh({ network, pubkey: publicKey });
        if (addressType === AddressType.SegwitP2SH) {
            script = payments.p2sh({
                network,
                redeem: script
            });
        }
    }
    const { address } = script;
    if (!address) {
        throw new Error('bitcoinjs-lib address derivation returned falsy value');
    }
    return address;
}
function privateKeyToKeyPair(privateKey, network) {
    return ECPair.fromWIF(privateKey, network);
}
function privateKeyToAddress(privateKey, network, addressType) {
    const keyPair = privateKeyToKeyPair(privateKey, network);
    return publicKeyToAddress(keyPair.publicKey, network, addressType);
}
function isValidPrivateKey(privateKey, network) {
    try {
        privateKeyToKeyPair(privateKey, network);
        return true;
    }
    catch (e) {
        return false;
    }
}

class BaseBitcoinPayments extends BitcoinishPayments {
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
            redeemScript = payments.p2wpkh({ pubkey: keyPair.publicKey }).output;
        }
        else if (this.addressType === AddressType.SegwitNative) {
            prevOutScript = payments.p2wpkh({ pubkey: keyPair.publicKey }).output;
        }
        let builder = new TransactionBuilder(this.bitcoinjsNetwork);
        for (let output of outputs) {
            builder.addOutput(output.address, toBaseDenominationNumber(output.value));
        }
        for (let i = 0; i < inputs.length; i++) {
            const input = inputs[i];
            builder.addInput(input.txid, input.vout, undefined, prevOutScript);
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

function splitDerivationPath(path) {
    let parts = path.split('/');
    if (parts[0] === 'm') {
        return parts.slice(1);
    }
    return parts;
}
function deriveHDNode(hdKey, derivationPath, network) {
    const rootNode = fromBase58(hdKey, network);
    const parts = splitDerivationPath(derivationPath).slice(rootNode.depth);
    let node = rootNode;
    if (parts.length > 0) {
        node = rootNode.derivePath(parts.join('/'));
    }
    return node;
}
function deriveKeyPair(baseNode, index, network) {
    return baseNode.derive(0).derive(index);
}
function deriveAddress(baseNode, index, network, addressType) {
    const keyPair = deriveKeyPair(baseNode, index);
    return publicKeyToAddress(keyPair.publicKey, network, addressType);
}
function xprvToXpub(xprv, derivationPath, network) {
    const node = deriveHDNode(xprv, derivationPath, network);
    return node.neutered().toBase58();
}

class HdBitcoinPayments extends BaseBitcoinPayments {
    constructor(config) {
        super(config);
        this.config = config;
        assertType(HdBitcoinPaymentsConfig, config);
        this.derivationPath = config.derivationPath || DEFAULT_DERIVATION_PATHS[this.addressType];
        if (this.isValidXpub(config.hdKey)) {
            this.xpub = config.hdKey;
            this.xprv = null;
        }
        else if (this.isValidXprv(config.hdKey)) {
            this.xpub = xprvToXpub(config.hdKey, this.derivationPath, this.bitcoinjsNetwork);
            this.xprv = config.hdKey;
        }
        else {
            const providedPrefix = config.hdKey.slice(0, 4);
            const xpubPrefix = bip32MagicNumberToPrefix(this.bitcoinjsNetwork.bip32.public);
            const xprvPrefix = bip32MagicNumberToPrefix(this.bitcoinjsNetwork.bip32.private);
            let reason = '';
            if (providedPrefix !== xpubPrefix && providedPrefix !== xprvPrefix) {
                reason = ` with prefix ${providedPrefix} but expected ${xprvPrefix} or ${xpubPrefix}`;
            }
            else {
                reason = ` (${validateHdKey(config.hdKey, this.bitcoinjsNetwork)})`;
            }
            throw new Error(`Invalid ${this.networkType} hdKey provided to bitcoin payments config${reason}`);
        }
        this.hdNode = deriveHDNode(config.hdKey, this.derivationPath, this.bitcoinjsNetwork);
    }
    isValidXprv(xprv) {
        return isValidXprv(xprv, this.bitcoinjsNetwork);
    }
    isValidXpub(xpub) {
        return isValidXpub(xpub, this.bitcoinjsNetwork);
    }
    getFullConfig() {
        return {
            ...this.config,
            derivationPath: this.derivationPath,
            addressType: this.addressType,
        };
    }
    getPublicConfig() {
        return {
            ...omit(this.getFullConfig(), ['logger', 'server', 'hdKey']),
            hdKey: this.xpub,
        };
    }
    getAccountId(index) {
        return this.xpub;
    }
    getAccountIds() {
        return [this.xpub];
    }
    getAddress(index) {
        return deriveAddress(this.hdNode, index, this.bitcoinjsNetwork, this.addressType);
    }
    getKeyPair(index) {
        if (!this.xprv) {
            throw new Error(`Cannot get private key ${index} - HdBitcoinPayments was created with an xpub`);
        }
        return deriveKeyPair(this.hdNode, index, this.bitcoinjsNetwork);
    }
}

class BitcoinPaymentsUtils extends BitcoinishPaymentsUtils {
    constructor(config = {}) {
        super(toBitcoinishConfig(config));
    }
    async isValidAddress(address) {
        return isValidAddress(address, this.bitcoinjsNetwork);
    }
    async isValidPrivateKey(privateKey) {
        return isValidPrivateKey(privateKey, this.bitcoinjsNetwork);
    }
}

class BitcoinPaymentsFactory {
    forConfig(config) {
        if (HdBitcoinPaymentsConfig.is(config)) {
            return new HdBitcoinPayments(config);
        }
        throw new Error('Cannot instantiate bitcoin payments for unsupported config');
    }
}

export { AddressType, AddressTypeT, BaseBitcoinPayments, BaseBitcoinPaymentsConfig, BitcoinBlock, BitcoinBroadcastResult, BitcoinPaymentsConfig, BitcoinPaymentsFactory, BitcoinPaymentsUtils, BitcoinPaymentsUtilsConfig, BitcoinSignedTransaction, BitcoinTransactionInfo, BitcoinUnsignedTransaction, BitcoinUnsignedTransactionData, BitcoinishBlock, BitcoinishBroadcastResult, BitcoinishPaymentTx, BitcoinishPayments, BitcoinishPaymentsUtils, BitcoinishSignedTransaction, BitcoinishTransactionInfo, BitcoinishTxOutput, BitcoinishUnsignedTransaction, BitcoinishWeightedChangeOutput, BlockbookConfigServer, BlockbookConnected, BlockbookConnectedConfig, BlockbookServerAPI, COIN_NAME, COIN_SYMBOL, DECIMAL_PLACES, DEFAULT_ADDRESS_TYPE, DEFAULT_DERIVATION_PATHS, DEFAULT_DUST_THRESHOLD, DEFAULT_FEE_LEVEL, DEFAULT_MAINNET_SERVER, DEFAULT_MIN_TX_FEE, DEFAULT_NETWORK, DEFAULT_NETWORK_MIN_RELAY_FEE, DEFAULT_SAT_PER_BYTE_LEVELS, DEFAULT_TESTNET_SERVER, HdBitcoinPayments, HdBitcoinPaymentsConfig, NETWORK_MAINNET, NETWORK_TESTNET, PACKAGE_NAME, PayportOutput, isValidAddress, isValidExtraId, isValidPrivateKey, isValidXprv, isValidXpub, privateKeyToAddress, publicKeyToAddress, toBaseDenominationBigNumber, toBaseDenominationNumber, toBaseDenominationString, toMainDenominationBigNumber, toMainDenominationNumber, toMainDenominationString, validateHdKey };
//# sourceMappingURL=index.es.js.map
