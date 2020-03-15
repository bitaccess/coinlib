'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var bitcoin = require('bitcoinjs-lib');
var paymentsCommon = require('@faast/payments-common');
var request = _interopDefault(require('request-promise-native'));
var bs58 = _interopDefault(require('bs58'));
var t = require('io-ts');
var tsCommon = require('@faast/ts-common');
var blockbookClient = require('blockbook-client');
var lodash = require('lodash');
var promiseRetry = _interopDefault(require('promise-retry'));
var BigNumber = _interopDefault(require('bignumber.js'));
var bip32 = require('bip32');

class BlockbookServerAPI extends blockbookClient.BlockbookBitcoin {
}
const BlockbookConfigServer = t.union([
    t.string,
    t.array(t.string),
    tsCommon.instanceofCodec(BlockbookServerAPI),
    t.null,
], 'BlockbookConfigServer');
const BlockbookConnectedConfig = tsCommon.requiredOptionalCodec({
    network: paymentsCommon.NetworkTypeT,
    server: BlockbookConfigServer,
}, {
    logger: tsCommon.nullable(tsCommon.Logger),
}, 'BlockbookConnectedConfig');
const BitcoinishTxOutput = t.type({
    address: t.string,
    value: t.string,
}, 'BitcoinishTxOutput');
const BitcoinishWeightedChangeOutput = t.type({
    address: t.string,
    weight: t.number,
}, 'BitcoinishWeightedChangeOutput');
const BitcoinishPaymentTx = tsCommon.requiredOptionalCodec({
    inputs: t.array(paymentsCommon.UtxoInfo),
    outputs: t.array(BitcoinishTxOutput),
    fee: t.string,
    change: t.string,
    changeAddress: tsCommon.nullable(t.string),
}, {
    externalOutputs: t.array(BitcoinishTxOutput),
    externalOutputTotal: t.string,
    changeOutputs: t.array(BitcoinishTxOutput),
}, 'BitcoinishPaymentTx');
const BitcoinishUnsignedTransaction = tsCommon.extendCodec(paymentsCommon.BaseUnsignedTransaction, {
    amount: t.string,
    fee: t.string,
}, 'BitcoinishUnsignedTransaction');
const BitcoinishSignedTransaction = tsCommon.extendCodec(paymentsCommon.BaseSignedTransaction, {
    data: t.type({
        hex: t.string,
    }),
}, {}, 'BitcoinishSignedTransaction');
const BitcoinishTransactionInfo = tsCommon.extendCodec(paymentsCommon.BaseTransactionInfo, {}, {}, 'BitcoinishTransactionInfo');
const BitcoinishBroadcastResult = tsCommon.extendCodec(paymentsCommon.BaseBroadcastResult, {}, {}, 'BitcoinishBroadcastResult');
const BitcoinishBlock = blockbookClient.BlockInfoBitcoin;
const PayportOutput = t.type({
    payport: paymentsCommon.ResolveablePayport,
    amount: tsCommon.Numeric,
}, 'PayportOutput');

function resolveServer(server, network) {
    if (tsCommon.isString(server)) {
        return {
            api: new blockbookClient.BlockbookBitcoin({
                nodes: [server],
            }),
            server: [server],
        };
    }
    else if (server instanceof blockbookClient.BlockbookBitcoin) {
        return {
            api: server,
            server: server.nodes,
        };
    }
    else if (Array.isArray(server)) {
        return {
            api: new blockbookClient.BlockbookBitcoin({
                nodes: server,
            }),
            server,
        };
    }
    else {
        return {
            api: new blockbookClient.BlockbookBitcoin({
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
            if (tsCommon.isMatchingError(e, RETRYABLE_ERRORS)) {
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
    return 10 + (148 * inputsCount) + (34 * outputsCount);
}
function estimateTxFee(satPerByte, inputsCount, outputsCount, handleSegwit) {
    return estimateTxSize(inputsCount, outputsCount) * satPerByte;
}
function sumUtxoValue(utxos) {
    return utxos.reduce((total, { value }) => total.plus(value), tsCommon.toBigNumber(0));
}
function sortUtxos(utxoList) {
    const result = [...utxoList];
    result.sort((a, b) => tsCommon.toBigNumber(a.value).minus(b.value).toNumber());
    return result;
}
function isConfirmedUtxo(utxo) {
    return Boolean((utxo.confirmations && utxo.confirmations > 0) || (utxo.height && Number.parseInt(utxo.height) > 0));
}

class BlockbookConnected {
    constructor(config) {
        tsCommon.assertType(BlockbookConnectedConfig, config);
        this.networkType = config.network;
        this.logger = new tsCommon.DelegateLogger(config.logger);
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
        const unitConverters = paymentsCommon.createUnitConverters(this.decimals);
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
        if (!tsCommon.isNil(extraId)) {
            return 'Invalid payport extraId';
        }
    }
    async getPayportValidationMessage(payport) {
        try {
            payport = tsCommon.assertType(paymentsCommon.Payport, payport, 'payport');
        }
        catch (e) {
            return e.message;
        }
        return this._getPayportValidationMessage(payport);
    }
    async validatePayport(payport) {
        payport = tsCommon.assertType(paymentsCommon.Payport, payport, 'payport');
        const message = await this._getPayportValidationMessage(payport);
        if (message) {
            throw new Error(message);
        }
    }
    async isValidPayport(payport) {
        return paymentsCommon.Payport.is(payport) && !(await this._getPayportValidationMessage(payport));
    }
    toMainDenomination(amount) {
        return this.toMainDenominationString(amount);
    }
    toBaseDenomination(amount) {
        return this.toBaseDenominationString(amount);
    }
    async getBlock(id) {
        if (tsCommon.isUndefined(id)) {
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
        this.targetUtxoPoolSize = tsCommon.isUndefined(config.targetUtxoPoolSize) ? 1 : config.targetUtxoPoolSize;
        const minChange = tsCommon.toBigNumber(tsCommon.isUndefined(config.minChange) ? 0 : config.minChange);
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
        else if (paymentsCommon.Payport.is(payport)) {
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
        if (tsCommon.isType(paymentsCommon.FeeOptionCustom, feeOption)) {
            targetLevel = paymentsCommon.FeeLevel.Custom;
            target = feeOption;
        }
        else {
            targetLevel = feeOption.feeLevel || this.defaultFeeLevel;
            target = await this.getFeeRateRecommendation(targetLevel);
        }
        if (target.feeRateType === paymentsCommon.FeeRateType.Base) {
            feeBase = target.feeRate;
            feeMain = this.toMainDenominationString(feeBase);
        }
        else if (target.feeRateType === paymentsCommon.FeeRateType.Main) {
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
                height: tsCommon.isUndefined(height) ? undefined : String(height),
                lockTime: tsCommon.isUndefined(lockTime) ? undefined : String(lockTime),
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
        if (feeRateType === paymentsCommon.FeeRateType.BasePerWeight) {
            return estimateTxFee(Number.parseFloat(feeRate), inputCount, outputCount, this.isSegwit);
        }
        else if (feeRateType === paymentsCommon.FeeRateType.Main) {
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
            const satoshis = tsCommon.isUndefined(utxo.satoshis)
                ? this.toBaseDenominationNumber(utxo.value)
                : tsCommon.toBigNumber(utxo.satoshis).integerValue(BigNumber.ROUND_DOWN).toNumber();
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
        const useAllUtxos = tsCommon.isUndefined(params.useAllUtxos) ? false : params.useAllUtxos;
        const useUnconfirmedUtxos = tsCommon.isUndefined(params.useUnconfirmedUtxos) ? false : params.useUnconfirmedUtxos;
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
        tsCommon.assertType(t.array(PayportOutput), to);
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
            resultToIndex = tsCommon.isNumber(to[0].payport) ? to[0].payport : null;
        }
        return {
            status: paymentsCommon.TransactionStatus.Unsigned,
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
        const availableUtxos = tsCommon.isUndefined(options.utxos)
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
        const status = isConfirmed ? paymentsCommon.TransactionStatus.Confirmed : paymentsCommon.TransactionStatus.Pending;
        const amountSat = lodash.get(tx, 'vout.0.value', tx.value);
        const amount = this.toMainDenominationString(amountSat);
        const fromAddress = lodash.get(tx, 'vin.0.addresses.0');
        if (!fromAddress) {
            throw new Error(`Unable to determine fromAddress of ${this.coinSymbol} tx ${txId}`);
        }
        const toAddress = lodash.get(tx, 'vout.0.addresses.0');
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

(function (AddressType) {
    AddressType["Legacy"] = "p2pkh";
    AddressType["SegwitP2SH"] = "p2sh-p2wpkh";
    AddressType["SegwitNative"] = "p2wpkh";
})(exports.AddressType || (exports.AddressType = {}));
const AddressTypeT = tsCommon.enumCodec(exports.AddressType, 'AddressType');
const BitcoinPaymentsUtilsConfig = tsCommon.extendCodec(paymentsCommon.BaseConfig, {}, {
    server: BlockbookConfigServer,
}, 'BitcoinPaymentsUtilsConfig');
const BaseBitcoinPaymentsConfig = tsCommon.extendCodec(BitcoinPaymentsUtilsConfig, {}, {
    addressType: AddressTypeT,
    minTxFee: paymentsCommon.FeeRate,
    dustThreshold: t.number,
    networkMinRelayFee: t.number,
    targetUtxoPoolSize: t.number,
    minChange: t.string,
}, 'BaseBitcoinPaymentsConfig');
const HdBitcoinPaymentsConfig = tsCommon.extendCodec(BaseBitcoinPaymentsConfig, {
    hdKey: t.string,
}, {
    derivationPath: t.string,
}, 'HdBitcoinPaymentsConfig');
const BitcoinPaymentsConfig = HdBitcoinPaymentsConfig;
const BitcoinUnsignedTransactionData = BitcoinishPaymentTx;
const BitcoinUnsignedTransaction = tsCommon.extendCodec(paymentsCommon.BaseUnsignedTransaction, {
    amount: t.string,
    fee: t.string,
    data: BitcoinUnsignedTransactionData,
}, 'BitcoinUnsignedTransaction');
const BitcoinSignedTransaction = tsCommon.extendCodec(paymentsCommon.BaseSignedTransaction, {
    data: t.type({
        hex: t.string,
    }),
}, {}, 'BitcoinSignedTransaction');
const BitcoinTransactionInfo = tsCommon.extendCodec(paymentsCommon.BaseTransactionInfo, {}, {}, 'BitcoinTransactionInfo');
const BitcoinBroadcastResult = tsCommon.extendCodec(paymentsCommon.BaseBroadcastResult, {}, {}, 'BitcoinBroadcastResult');
const BitcoinBlock = blockbookClient.BlockInfoBitcoin;

const PACKAGE_NAME = 'bitcoin-payments';
const DECIMAL_PLACES = 8;
const COIN_SYMBOL = 'BTC';
const COIN_NAME = 'Bitcoin';
const DEFAULT_DUST_THRESHOLD = 546;
const DEFAULT_NETWORK_MIN_RELAY_FEE = 1000;
const BITCOIN_SEQUENCE_RBF = 0xFFFFFFFD;
const DEFAULT_MIN_TX_FEE = 5;
const DEFAULT_ADDRESS_TYPE = exports.AddressType.SegwitNative;
const DEFAULT_DERIVATION_PATHS = {
    [exports.AddressType.Legacy]: "m/44'/0'/0'",
    [exports.AddressType.SegwitP2SH]: "m/49'/0'/0'",
    [exports.AddressType.SegwitNative]: "m/84'/0'/0'",
};
const DEFAULT_NETWORK = paymentsCommon.NetworkType.Mainnet;
const NETWORK_MAINNET = bitcoin.networks.bitcoin;
const NETWORK_TESTNET = bitcoin.networks.testnet;
const DEFAULT_MAINNET_SERVER = process.env.BITCOIN_SERVER_URL
    ? process.env.BITCOIN_SERVER_URL.split(',')
    : ['https://btc1.trezor.io', 'https://btc2.trezor.io'];
const DEFAULT_TESTNET_SERVER = process.env.BITCOIN_TESTNET_SERVER_URL
    ? process.env.BITCOIN_TESTNET_SERVER_URL.split(',')
    : ['https://tbtc1.trezor.io', 'https://tbtc2.trezor.io'];
const DEFAULT_FEE_LEVEL = paymentsCommon.FeeLevel.Medium;
const DEFAULT_SAT_PER_BYTE_LEVELS = {
    [paymentsCommon.FeeLevel.High]: 50,
    [paymentsCommon.FeeLevel.Medium]: 25,
    [paymentsCommon.FeeLevel.Low]: 10,
};

const DEFAULT_BITCOINISH_CONFIG = {
    coinSymbol: COIN_SYMBOL,
    coinName: COIN_NAME,
    decimals: DECIMAL_PLACES,
    dustThreshold: DEFAULT_DUST_THRESHOLD,
    networkMinRelayFee: DEFAULT_NETWORK_MIN_RELAY_FEE,
    minTxFee: {
        feeRate: DEFAULT_MIN_TX_FEE.toString(),
        feeRateType: paymentsCommon.FeeRateType.BasePerWeight,
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
        bitcoinjsNetwork: network === paymentsCommon.NetworkType.Testnet ? NETWORK_TESTNET : NETWORK_MAINNET,
        isSegwit: addressType === exports.AddressType.SegwitNative || addressType === exports.AddressType.SegwitP2SH,
        server: typeof server !== 'undefined'
            ? server
            : (network === paymentsCommon.NetworkType.Testnet
                ? DEFAULT_TESTNET_SERVER
                : DEFAULT_MAINNET_SERVER),
    };
}
async function getBlockcypherFeeEstimate(feeLevel, networkType) {
    const body = await request.get(`https://api.blockcypher.com/v1/btc/${networkType === paymentsCommon.NetworkType.Mainnet ? 'main' : 'test3'}`, { json: true });
    const feePerKbField = `${feeLevel}_fee_per_kb`;
    const feePerKb = body[feePerKbField];
    if (!feePerKb) {
        throw new Error(`Blockcypher response is missing expected field ${feePerKbField}`);
    }
    return feePerKb / 1000;
}

const { toMainDenominationBigNumber, toMainDenominationString, toMainDenominationNumber, toBaseDenominationBigNumber, toBaseDenominationString, toBaseDenominationNumber, } = paymentsCommon.createUnitConverters(DECIMAL_PLACES);
function isValidXprv(xprv, network) {
    try {
        return !bip32.fromBase58(xprv, network).isNeutered();
    }
    catch (e) {
        return false;
    }
}
function isValidXpub(xpub, network) {
    try {
        return bip32.fromBase58(xpub, network).isNeutered();
    }
    catch (e) {
        return false;
    }
}
function validateHdKey(hdKey, network) {
    try {
        bip32.fromBase58(hdKey, network);
    }
    catch (e) {
        return e.toString();
    }
}
function isValidAddress(address, network) {
    try {
        bitcoin.address.toOutputScript(address, network);
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
    if (addressType === exports.AddressType.Legacy) {
        script = bitcoin.payments.p2pkh({ network, pubkey: publicKey });
    }
    else {
        script = bitcoin.payments.p2wpkh({ network, pubkey: publicKey });
        if (addressType === exports.AddressType.SegwitP2SH) {
            script = bitcoin.payments.p2sh({
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
    return bitcoin.ECPair.fromWIF(privateKey, network);
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
            feeRateType: paymentsCommon.FeeRateType.BasePerWeight,
        };
    }
    async signTransaction(tx) {
        const keyPair = this.getKeyPair(tx.fromIndex);
        const { inputs, outputs } = tx.data;
        let redeemScript = undefined;
        let prevOutScript = undefined;
        if (this.addressType === exports.AddressType.SegwitP2SH) {
            redeemScript = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey }).output;
        }
        else if (this.addressType === exports.AddressType.SegwitNative) {
            prevOutScript = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey }).output;
        }
        let builder = new bitcoin.TransactionBuilder(this.bitcoinjsNetwork);
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
            status: paymentsCommon.TransactionStatus.Signed,
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
    const rootNode = bip32.fromBase58(hdKey, network);
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
        tsCommon.assertType(HdBitcoinPaymentsConfig, config);
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
            ...lodash.omit(this.getFullConfig(), ['logger', 'server', 'hdKey']),
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

Object.defineProperty(exports, 'UtxoInfo', {
  enumerable: true,
  get: function () {
    return paymentsCommon.UtxoInfo;
  }
});
exports.AddressTypeT = AddressTypeT;
exports.BITCOIN_SEQUENCE_RBF = BITCOIN_SEQUENCE_RBF;
exports.BaseBitcoinPayments = BaseBitcoinPayments;
exports.BaseBitcoinPaymentsConfig = BaseBitcoinPaymentsConfig;
exports.BitcoinBlock = BitcoinBlock;
exports.BitcoinBroadcastResult = BitcoinBroadcastResult;
exports.BitcoinPaymentsConfig = BitcoinPaymentsConfig;
exports.BitcoinPaymentsFactory = BitcoinPaymentsFactory;
exports.BitcoinPaymentsUtils = BitcoinPaymentsUtils;
exports.BitcoinPaymentsUtilsConfig = BitcoinPaymentsUtilsConfig;
exports.BitcoinSignedTransaction = BitcoinSignedTransaction;
exports.BitcoinTransactionInfo = BitcoinTransactionInfo;
exports.BitcoinUnsignedTransaction = BitcoinUnsignedTransaction;
exports.BitcoinUnsignedTransactionData = BitcoinUnsignedTransactionData;
exports.BitcoinishBlock = BitcoinishBlock;
exports.BitcoinishBroadcastResult = BitcoinishBroadcastResult;
exports.BitcoinishPaymentTx = BitcoinishPaymentTx;
exports.BitcoinishPayments = BitcoinishPayments;
exports.BitcoinishPaymentsUtils = BitcoinishPaymentsUtils;
exports.BitcoinishSignedTransaction = BitcoinishSignedTransaction;
exports.BitcoinishTransactionInfo = BitcoinishTransactionInfo;
exports.BitcoinishTxOutput = BitcoinishTxOutput;
exports.BitcoinishUnsignedTransaction = BitcoinishUnsignedTransaction;
exports.BitcoinishWeightedChangeOutput = BitcoinishWeightedChangeOutput;
exports.BlockbookConfigServer = BlockbookConfigServer;
exports.BlockbookConnected = BlockbookConnected;
exports.BlockbookConnectedConfig = BlockbookConnectedConfig;
exports.BlockbookServerAPI = BlockbookServerAPI;
exports.COIN_NAME = COIN_NAME;
exports.COIN_SYMBOL = COIN_SYMBOL;
exports.DECIMAL_PLACES = DECIMAL_PLACES;
exports.DEFAULT_ADDRESS_TYPE = DEFAULT_ADDRESS_TYPE;
exports.DEFAULT_DERIVATION_PATHS = DEFAULT_DERIVATION_PATHS;
exports.DEFAULT_DUST_THRESHOLD = DEFAULT_DUST_THRESHOLD;
exports.DEFAULT_FEE_LEVEL = DEFAULT_FEE_LEVEL;
exports.DEFAULT_MAINNET_SERVER = DEFAULT_MAINNET_SERVER;
exports.DEFAULT_MIN_TX_FEE = DEFAULT_MIN_TX_FEE;
exports.DEFAULT_NETWORK = DEFAULT_NETWORK;
exports.DEFAULT_NETWORK_MIN_RELAY_FEE = DEFAULT_NETWORK_MIN_RELAY_FEE;
exports.DEFAULT_SAT_PER_BYTE_LEVELS = DEFAULT_SAT_PER_BYTE_LEVELS;
exports.DEFAULT_TESTNET_SERVER = DEFAULT_TESTNET_SERVER;
exports.HdBitcoinPayments = HdBitcoinPayments;
exports.HdBitcoinPaymentsConfig = HdBitcoinPaymentsConfig;
exports.NETWORK_MAINNET = NETWORK_MAINNET;
exports.NETWORK_TESTNET = NETWORK_TESTNET;
exports.PACKAGE_NAME = PACKAGE_NAME;
exports.PayportOutput = PayportOutput;
exports.isValidAddress = isValidAddress;
exports.isValidExtraId = isValidExtraId;
exports.isValidPrivateKey = isValidPrivateKey;
exports.isValidXprv = isValidXprv;
exports.isValidXpub = isValidXpub;
exports.privateKeyToAddress = privateKeyToAddress;
exports.publicKeyToAddress = publicKeyToAddress;
exports.toBaseDenominationBigNumber = toBaseDenominationBigNumber;
exports.toBaseDenominationNumber = toBaseDenominationNumber;
exports.toBaseDenominationString = toBaseDenominationString;
exports.toMainDenominationBigNumber = toMainDenominationBigNumber;
exports.toMainDenominationNumber = toMainDenominationNumber;
exports.toMainDenominationString = toMainDenominationString;
exports.validateHdKey = validateHdKey;
//# sourceMappingURL=index.cjs.js.map
