import { networks, address, payments, ECPair, TransactionBuilder } from 'bitcoinjs-lib';
import { NetworkTypeT, UtxoInfo, BaseUnsignedTransaction, BaseSignedTransaction, BaseTransactionInfo, BaseBroadcastResult, createUnitConverters, Payport, FeeRateType, FeeOptionCustom, FeeLevel, TransactionStatus, BaseConfig, FeeRate, NetworkType } from '@faast/payments-common';
export { UtxoInfo } from '@faast/payments-common';
import request from 'request-promise-native';
import bs58 from 'bs58';
import { union, string, null as null$1, type, array, number } from 'io-ts';
import { toBigNumber, isMatchingError, isString, instanceofCodec, requiredOptionalCodec, nullable, Logger, extendCodec, assertType, DelegateLogger, isNil, isUndefined, isType, enumCodec } from '@faast/ts-common';
import { BlockbookBitcoin, BlockInfoBitcoin } from 'blockbook-client';
import BigNumber from 'bignumber.js';
import { get, omit } from 'lodash';
import promiseRetry from 'promise-retry';
import { fromBase58 } from 'bip32';

function resolveServer(server, network) {
    if (isString(server)) {
        return {
            api: new BlockbookBitcoin({
                nodes: [server],
            }),
            server,
        };
    }
    else if (server instanceof BlockbookBitcoin) {
        return {
            api: server,
            server: server.nodes[0] || '',
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
function sortUtxos(utxoList) {
    const matureList = [];
    const immatureList = [];
    utxoList.forEach((utxo) => {
        if (utxo.confirmations && utxo.confirmations >= 6) {
            matureList.push(utxo);
        }
        else {
            immatureList.push(utxo);
        }
    });
    matureList.sort((a, b) => toBigNumber(a.value).minus(b.value).toNumber());
    immatureList.sort((a, b) => (b.confirmations || 0) - (a.confirmations || 0));
    return matureList.concat(immatureList);
}

class BlockbookServerAPI extends BlockbookBitcoin {
}
const BlockbookConfigServer = union([string, instanceofCodec(BlockbookServerAPI), null$1], 'BlockbookConfigServer');
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
const BitcoinishPaymentTx = type({
    inputs: array(UtxoInfo),
    outputs: array(BitcoinishTxOutput),
    fee: string,
    change: string,
    changeAddress: nullable(string),
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
const DEFAULT_MAINNET_SERVER = process.env.BITCOIN_SERVER_URL || 'https://btc1.trezor.io';
const DEFAULT_TESTNET_SERVER = process.env.BITCOIN_TESTNET_SERVER_URL || 'https://tbtc1.trezor.io';
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

export { AddressType, AddressTypeT, BaseBitcoinPayments, BaseBitcoinPaymentsConfig, BitcoinBlock, BitcoinBroadcastResult, BitcoinPaymentsConfig, BitcoinPaymentsFactory, BitcoinPaymentsUtils, BitcoinPaymentsUtilsConfig, BitcoinSignedTransaction, BitcoinTransactionInfo, BitcoinUnsignedTransaction, BitcoinUnsignedTransactionData, BitcoinishBlock, BitcoinishBroadcastResult, BitcoinishPaymentTx, BitcoinishSignedTransaction, BitcoinishTransactionInfo, BitcoinishTxOutput, BitcoinishUnsignedTransaction, BlockbookConfigServer, BlockbookConnectedConfig, BlockbookServerAPI, COIN_NAME, COIN_SYMBOL, DECIMAL_PLACES, DEFAULT_ADDRESS_TYPE, DEFAULT_DERIVATION_PATHS, DEFAULT_DUST_THRESHOLD, DEFAULT_FEE_LEVEL, DEFAULT_MAINNET_SERVER, DEFAULT_MIN_TX_FEE, DEFAULT_NETWORK, DEFAULT_NETWORK_MIN_RELAY_FEE, DEFAULT_SAT_PER_BYTE_LEVELS, DEFAULT_TESTNET_SERVER, HdBitcoinPayments, HdBitcoinPaymentsConfig, NETWORK_MAINNET, NETWORK_TESTNET, PACKAGE_NAME, isValidAddress, isValidExtraId, isValidPrivateKey, isValidXprv, isValidXpub, privateKeyToAddress, publicKeyToAddress, toBaseDenominationBigNumber, toBaseDenominationNumber, toBaseDenominationString, toMainDenominationBigNumber, toMainDenominationNumber, toMainDenominationString, validateHdKey };
//# sourceMappingURL=index.es.js.map
