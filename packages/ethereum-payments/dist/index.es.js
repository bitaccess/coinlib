import { BigNumber } from 'bignumber.js';
import { Transaction } from 'ethereumjs-tx';
import Web3 from 'web3';
import { cloneDeep, omit } from 'lodash';
import { FeeLevel, Payport, FeeOptionCustom, FeeRateType, TransactionStatus, NetworkType, BaseConfig, BaseUnsignedTransaction, BaseSignedTransaction, BaseTransactionInfo, BaseBroadcastResult, ResolvedFeeOption } from '@faast/payments-common';
import { DelegateLogger, assertType, isType, extendCodec } from '@faast/ts-common';
import { post, get } from 'request-promise-native';
import { pubToAddress } from 'ethereumjs-util';
import { fromSeed, fromBase58 } from 'bip32';
import crypto from 'crypto';
import { ec as ec$1 } from 'elliptic';
import { type, string, union, null as null$1, undefined as undefined$1, array, record, number, literal, object } from 'io-ts';

const PACKAGE_NAME = 'ethereum-payments';
const DECIMAL_PLACES = 18;
const DEFAULT_FULL_NODE = process.env.ETH_FULL_NODE_URL;
const DEFAULT_SOLIDITY_NODE = process.env.ETH_SOLIDITY_NODE_URL;
const DEFAULT_EVENT_SERVER = process.env.ETH_EVENT_SERVER_URL;
const DEFAULT_FEE_LEVEL = FeeLevel.Medium;
const FEE_LEVEL_MAP = {
    'low': 'SLOW',
    'medium': 'NORM',
    'high': 'FAST',
};
const MIN_CONFIRMATIONS = 0;
const ETHEREUM_TRANSFER_COST = '21000';
const DEFAULT_GAS_PRICE_IN_WEI = '50000000000';
const GAS_STATION_URL = 'https://ethgasstation.info';
const CONTRACT_DEPLOY_COST = '285839';
const TOKEN_SWEEP_COST = '816630';
const TOKEN_TRANSFER_COST = '250000';
const SPEED = {
    SLOW: 'safeLow',
    NORM: 'average',
    FAST: 'fast',
};
const PRICES = {
    'ETHEREUM_TRANSFER': ETHEREUM_TRANSFER_COST,
    'CONTRACT_DEPLOY': CONTRACT_DEPLOY_COST,
    'TOKEN_SWEEP': TOKEN_SWEEP_COST,
    'TOKEN_TRANSFER': TOKEN_TRANSFER_COST,
};

class NetworkData {
    constructor(gasStationUrl = GAS_STATION_URL, parityUrl, infuraUrl) {
        this.gasStationUrl = gasStationUrl;
        this.parityUrl = parityUrl;
        this.infuraUrl = infuraUrl;
        this.eth = (new Web3(infuraUrl)).eth;
    }
    async getNetworkData(action, from, to, speed) {
        const pricePerGasUnit = await this.getGasPrice(speed);
        const nonce = await this.getNonce(from);
        const amountOfGas = await this.estimateGas(from, to, action);
        return {
            pricePerGasUnit,
            amountOfGas,
            nonce,
        };
    }
    async getNonce(address) {
        const web3Nonce = await this.getWeb3Nonce(address) || '0';
        const parityNonce = await this.getParityNonce(address) || '0';
        const nonce = BigNumber.maximum(web3Nonce, parityNonce);
        return nonce.toNumber() ? nonce.toString() : '0';
    }
    async getGasPrice(speed) {
        let gasPrice = await this.getGasStationGasPrice(speed);
        if (gasPrice)
            return gasPrice;
        gasPrice = await this.getWeb3GasPrice();
        if (gasPrice)
            return gasPrice;
        return DEFAULT_GAS_PRICE_IN_WEI;
    }
    async estimateGas(from, to, action) {
        let gas = PRICES[action];
        if (gas)
            return gas;
        try {
            gas = new BigNumber(await this.eth.estimateGas({ from, to }));
        }
        catch (e) {
            return PRICES.ETHEREUM_TRANSFER;
        }
        return gas.toNumber() ? gas.toString() : PRICES.ETHEREUM_TRANSFER;
    }
    async getWeb3Nonce(address) {
        try {
            const nonce = await this.eth.getTransactionCount(address, 'pending');
            return (new BigNumber(nonce)).toString();
        }
        catch (e) {
            return '';
        }
    }
    async getParityNonce(address) {
        const data = {
            method: 'parity_nextNonce',
            params: [address],
            id: 1,
            jsonrpc: '2.0'
        };
        const options = {
            url: this.parityUrl || '',
            json: data
        };
        let body;
        try {
            body = await post(options);
        }
        catch (e) {
            return '';
        }
        if (!body || !body.result) {
            return '';
        }
        return (new BigNumber(body.result, 16)).toString();
    }
    async getGasStationGasPrice(speed) {
        const options = {
            url: `${this.gasStationUrl}/json/ethgasAPI.json`,
            json: true,
            timeout: 5000
        };
        let body;
        try {
            body = await get(options);
        }
        catch (e) {
            return '';
        }
        if (!(body && body.blockNum && body[SPEED[speed]])) {
            return '';
        }
        const price10xGwei = body[SPEED[speed]];
        return (new BigNumber(price10xGwei)).multipliedBy(10).multipliedBy(1e9).toString(10);
    }
    async getWeb3GasPrice() {
        try {
            return await this.eth.getGasPrice();
        }
        catch (e) {
            return '';
        }
    }
}

const ec = new ec$1('secp256k1');
class EthereumBIP44 {
    constructor(hdKey) {
        this.parts = [
            'm',
            "44'",
            "60'",
            "0'",
            '0'
        ];
        this.key = hdKey;
    }
    static fromExtKey(xkey) {
        if (['xprv', 'xpub'].includes(xkey.substring(0, 4))) {
            return new EthereumBIP44(fromBase58(xkey));
        }
        throw new Error('Not extended key');
    }
    getAddress(index) {
        const derived = this.deriveByIndex(index);
        let address = pubToAddress(derived.publicKey, true);
        return `0x${address.toString('hex')}`;
    }
    getPrivateKey(index) {
        const derived = this.deriveByIndex(index);
        if (!derived.privateKey) {
            return '';
        }
        return `0x${derived.privateKey.toString('hex')}`;
    }
    getPublicKey(index) {
        return this.deriveByIndex(index).publicKey.toString('hex');
    }
    getXPrivateKey(index) {
        const key = this.deriveByIndex(index).toBase58();
        return key.substring(0, 4) === 'xpub' ? '' : key;
    }
    getXPublicKey(index) {
        return this.deriveByIndex(index).neutered().toBase58();
    }
    deriveByIndex(index) {
        if (typeof index === 'undefined') {
            return this.key;
        }
        const path = this.parts.slice(this.key.depth);
        const keyPath = path.length > 0 ? path.join('/') + '/' : '';
        return this.key.derivePath(`${keyPath}${index.toString()}`);
    }
}
function deriveSignatory(xkey, index) {
    const wallet = xkey ?
        EthereumBIP44.fromExtKey(xkey) :
        EthereumBIP44.fromExtKey(fromSeed(crypto.randomBytes(32)).toBase58());
    return {
        address: wallet.getAddress(index),
        keys: {
            prv: wallet.getPrivateKey(index) || '',
            pub: wallet.getPublicKey(index),
        },
        xkeys: {
            xprv: wallet.getXPrivateKey(index) || '',
            xpub: wallet.getXPublicKey(index),
        }
    };
}
function isValidXkey(key) {
    try {
        EthereumBIP44.fromExtKey(key);
        return true;
    }
    catch (e) {
        return false;
    }
}

const web3 = new Web3();
class EthereumPaymentsUtils {
    constructor(config) {
        this.logger = new DelegateLogger(config.logger, PACKAGE_NAME);
    }
    toBaseDenomination(amount, options) {
        const eth = (new BigNumber(amount)).toFixed(DECIMAL_PLACES, options ? options.rounding : undefined);
        return web3.utils.toWei(eth);
    }
    toMainDenomination(amount, options) {
        const wei = (new BigNumber(amount)).toFixed(0, options ? options.rounding : undefined);
        return web3.utils.fromWei(wei);
    }
    async isValidAddress(address) {
        return web3.utils.isAddress(address);
    }
    async isValidExtraId(extraId) {
        return false;
    }
    async isValidPayport(payport) {
        return Payport.is(payport) && !await this._getPayportValidationMessage(payport);
    }
    async validatePayport(payport) {
        const message = await this._getPayportValidationMessage(payport);
        if (message) {
            throw new Error(message);
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
    isValidXprv(xprv) {
        return isValidXkey(xprv) && xprv.substring(0, 4) === 'xprv';
    }
    isValidXpub(xpub) {
        return isValidXkey(xpub) && xpub.substring(0, 4) === 'xpub';
    }
    isValidPrivateKey(prv) {
        try {
            return !!web3.eth.accounts.privateKeyToAccount(prv);
        }
        catch (e) {
            return false;
        }
    }
    privateKeyToAddress(prv) {
        let key;
        if (prv.substring(0, 2) === '0x') {
            key = prv;
        }
        else {
            key = `0x${prv}`;
        }
        return web3.eth.accounts.privateKeyToAccount(key).address;
    }
    async _getPayportValidationMessage(payport) {
        try {
            const { address } = payport;
            if (!(await this.isValidAddress(address))) {
                return 'Invalid payport address';
            }
        }
        catch (e) {
            return 'Invalid payport address';
        }
        return undefined;
    }
}

class BaseEthereumPayments extends EthereumPaymentsUtils {
    constructor(config) {
        super(config);
        this.config = config;
        this.eth = (new Web3(config.fullNode, null, { transactionConfirmationBlocks: MIN_CONFIRMATIONS })).eth;
        this.gasStation = new NetworkData(config.gasStation, config.parityNode, config.fullNode);
    }
    async init() { }
    async destroy() { }
    getFullConfig() {
        return this.config;
    }
    async resolvePayport(payport) {
        if (typeof payport === 'number') {
            return this.getPayport(payport);
        }
        else if (typeof payport === 'string') {
            if (!await this.isValidAddress(payport)) {
                throw new Error(`Invalid Ethereum address: ${payport}`);
            }
            return { address: payport };
        }
        if (!await this.isValidPayport(payport)) {
            throw new Error(`Invalid Ethereum payport: ${JSON.stringify(payport)}`);
        }
        else {
            if (!await this.isValidAddress(payport.address)) {
                throw new Error(`Invalid Ethereum payport: ${JSON.stringify(payport)}`);
            }
        }
        return payport;
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
    async resolveFeeOption(feeOption) {
        return isType(FeeOptionCustom, feeOption)
            ? this.resolveCustomFeeOption(feeOption)
            : this.resolveLeveledFeeOption(feeOption);
    }
    resolveCustomFeeOption(feeOption) {
        const isWeight = (feeOption.feeRateType === FeeRateType.BasePerWeight);
        const isMain = (feeOption.feeRateType === FeeRateType.Main);
        const gasPrice = isWeight
            ? feeOption.feeRate
            : (new BigNumber(feeOption.feeRate)).dividedBy(ETHEREUM_TRANSFER_COST).toString();
        const fee = isWeight
            ? (new BigNumber(feeOption.feeRate)).multipliedBy(ETHEREUM_TRANSFER_COST).toString()
            : feeOption.feeRate;
        return {
            targetFeeRate: feeOption.feeRate,
            targetFeeLevel: FeeLevel.Custom,
            targetFeeRateType: feeOption.feeRateType,
            feeBase: isMain ? this.toBaseDenomination(fee) : fee,
            feeMain: isMain ? fee : this.toMainDenomination(fee),
            gasPrice: isMain ? this.toBaseDenomination(gasPrice, { rounding: 7 }) : gasPrice
        };
    }
    async resolveLeveledFeeOption(feeOption) {
        const targetFeeLevel = feeOption.feeLevel || DEFAULT_FEE_LEVEL;
        const targetFeeRate = await this.gasStation.getGasPrice(FEE_LEVEL_MAP[targetFeeLevel]);
        const feeBase = (new BigNumber(targetFeeRate)).multipliedBy(ETHEREUM_TRANSFER_COST).toString();
        return {
            targetFeeRate,
            targetFeeLevel,
            targetFeeRateType: FeeRateType.BasePerWeight,
            feeBase,
            feeMain: this.toMainDenomination(feeBase),
            gasPrice: targetFeeRate,
        };
    }
    requiresBalanceMonitor() {
        return false;
    }
    async getAvailableUtxos() {
        return [];
    }
    async getUtxos() {
        return [];
    }
    usesSequenceNumber() {
        return true;
    }
    usesUtxos() {
        return false;
    }
    async getBalance(resolveablePayport) {
        const payport = await this.resolvePayport(resolveablePayport);
        const balance = await this.eth.getBalance(payport.address);
        const sweepable = await this.isSweepableBalance(balance);
        return {
            confirmedBalance: this.toMainDenomination(balance),
            unconfirmedBalance: '0',
            sweepable,
        };
    }
    async isSweepableBalance(balanceEth) {
        const feeOption = await this.resolveFeeOption({});
        const feeWei = new BigNumber(feeOption.feeBase);
        const balanceWei = new BigNumber(this.toBaseDenomination(balanceEth));
        if (balanceWei.minus(feeWei).isLessThanOrEqualTo(0)) {
            return false;
        }
        return true;
    }
    async getNextSequenceNumber(payport) {
        const resolvedPayport = await this.resolvePayport(payport);
        const sequenceNumber = await this.gasStation.getNonce(resolvedPayport.address);
        return sequenceNumber;
    }
    async getTransactionInfo(txid) {
        const minConfirmations = MIN_CONFIRMATIONS;
        const tx = await this.eth.getTransaction(txid);
        const currentBlockNumber = await this.eth.getBlockNumber();
        const txInfo = await this.eth.getTransactionReceipt(txid);
        const feeEth = this.toMainDenomination((new BigNumber(tx.gasPrice)).multipliedBy(txInfo.gasUsed));
        let txBlock = null;
        let isConfirmed = false;
        let confirmationTimestamp = null;
        let confirmations = null;
        if (tx.blockNumber) {
            confirmations = new BigNumber(currentBlockNumber).minus(tx.blockNumber);
            if (confirmations.isGreaterThan(minConfirmations)) {
                isConfirmed = true;
                txBlock = await this.eth.getBlock(tx.blockNumber);
                confirmationTimestamp = new Date(txBlock.timestamp);
            }
        }
        let status = TransactionStatus.Pending;
        if (isConfirmed) {
            status = txInfo.status ? TransactionStatus.Confirmed : TransactionStatus.Failed;
        }
        return {
            id: txid,
            amount: this.toMainDenomination(tx.value),
            toAddress: tx.to,
            fromAddress: tx.from,
            toExtraId: null,
            fromIndex: null,
            toIndex: null,
            fee: feeEth,
            sequenceNumber: tx.nonce,
            isExecuted: !!tx.blockNumber,
            isConfirmed,
            confirmations: confirmations.toNumber(),
            confirmationId: tx.blockHash,
            confirmationTimestamp,
            status,
            data: {
                ...tx,
                ...txInfo,
                currentBlock: currentBlockNumber
            },
        };
    }
    async createTransaction(from, to, amountEth, options = {}) {
        this.logger.debug('createTransaction', from, to, amountEth);
        return this.createTransactionObject(from, to, amountEth, options);
    }
    async createSweepTransaction(from, to, options = {}) {
        this.logger.debug('createSweepTransaction', from, to);
        return this.createTransactionObject(from, to, 'max', options);
    }
    async signTransaction(unsignedTx) {
        const fromPrivateKey = await this.getPrivateKey(unsignedTx.fromIndex);
        const payport = await this.getPayport(unsignedTx.fromIndex);
        const unsignedRaw = cloneDeep(unsignedTx.data);
        const extraParam = this.config.network === NetworkType.Testnet ? { chain: 'ropsten' } : undefined;
        const tx = new Transaction(unsignedRaw, extraParam);
        const key = Buffer.from(fromPrivateKey.slice(2), 'hex');
        tx.sign(key);
        return {
            ...unsignedTx,
            id: tx.hash().toString('hex'),
            status: TransactionStatus.Signed,
            data: {
                hex: '0x' + tx.serialize().toString('hex')
            }
        };
    }
    sendSignedTransactionQuick(txHex) {
        return new Promise((resolve, reject) => this.eth.sendSignedTransaction(txHex)
            .on('transactionHash', resolve)
            .on('error', reject));
    }
    async broadcastTransaction(tx) {
        if (tx.status !== TransactionStatus.Signed) {
            throw new Error(`Tx ${tx.id} has not status ${TransactionStatus.Signed}`);
        }
        try {
            const txId = await this.sendSignedTransactionQuick(tx.data.hex);
            return {
                id: txId,
            };
        }
        catch (e) {
            this.logger.warn(`Ethereum broadcast tx unsuccessful ${tx.id}: ${e.message}`);
            throw new Error(`Ethereum broadcast tx unsuccessful: ${tx.id} ${e.message}`);
        }
    }
    async createTransactionObject(from, to, amountEth = 'max', options = {}) {
        const sweepFlag = amountEth === 'max' ? true : false;
        const fromTo = await this.resolveFromTo(from, to);
        const feeOption = await this.resolveFeeOption(options);
        const { confirmedBalance: balanceEth } = await this.getBalance(fromTo.fromPayport);
        const nonce = options.sequenceNumber || await this.getNextSequenceNumber(from);
        const feeWei = new BigNumber(feeOption.feeBase);
        const balanceWei = this.toBaseDenomination(balanceEth);
        let amountWei;
        if (sweepFlag) {
            amountWei = (new BigNumber(balanceWei)).minus(feeWei);
            if (amountWei.isLessThan(0)) {
                throw new Error(`Insufficient balance (${balanceEth}) to sweep with fee of ${feeOption.feeMain} `);
            }
        }
        else {
            amountWei = new BigNumber(this.toBaseDenomination(amountEth));
            if (amountWei.plus(feeWei).isGreaterThan(balanceWei)) {
                throw new Error(`Insufficient balance (${balanceEth}) to send ${amountEth} including fee of ${feeOption.feeMain} `);
            }
        }
        const transactionObject = {
            from: fromTo.fromAddress,
            to: fromTo.toAddress,
            value: `0x${amountWei.toString(16)}`,
            gas: `0x${(new BigNumber(ETHEREUM_TRANSFER_COST)).toString(16)}`,
            gasPrice: `0x${(new BigNumber(feeOption.gasPrice)).toString(16)}`,
            nonce: `0x${(new BigNumber(nonce)).toString(16)}`,
        };
        return {
            status: TransactionStatus.Unsigned,
            id: '',
            fromAddress: fromTo.fromAddress,
            toAddress: fromTo.toAddress,
            toExtraId: null,
            fromIndex: fromTo.fromIndex,
            toIndex: fromTo.toIndex,
            amount: this.toMainDenomination(amountWei),
            fee: feeOption.feeMain,
            targetFeeLevel: feeOption.targetFeeLevel,
            targetFeeRate: feeOption.targetFeeRate,
            targetFeeRateType: feeOption.targetFeeRateType,
            sequenceNumber: nonce.toString(),
            data: transactionObject,
        };
    }
}

class HdEthereumPayments extends BaseEthereumPayments {
    constructor(config) {
        super(config);
        try {
            this.xprv = '';
            this.xpub = '';
            if (this.isValidXpub(config.hdKey)) {
                this.xpub = config.hdKey;
            }
            else if (this.isValidXprv(config.hdKey)) {
                this.xprv = config.hdKey;
                this.xpub = deriveSignatory(config.hdKey, 0).xkeys.xpub;
            }
        }
        catch (e) {
            throw new Error(`Account must be a valid xprv or xpub: ${e.message}`);
        }
    }
    static generateNewKeys() {
        return deriveSignatory();
    }
    getXpub() {
        return this.xpub;
    }
    getPublicConfig() {
        return {
            ...omit(this.getFullConfig(), ['hdKey', 'logger', 'fullNode', 'solidityNode', 'eventServer']),
            hdKey: this.getXpub(),
        };
    }
    getAccountId(index) {
        return this.getXpub();
    }
    getAccountIds() {
        return [this.getXpub()];
    }
    async getPayport(index) {
        const { address } = deriveSignatory(this.getXpub(), index);
        if (!await this.isValidAddress(address)) {
            throw new Error(`Cannot get address ${index} - validation failed for derived address`);
        }
        return { address };
    }
    async getPrivateKey(index) {
        if (!this.xprv) {
            throw new Error(`Cannot get private key ${index} - HdEthereumPayments was created with an xpub`);
        }
        return deriveSignatory(deriveSignatory(this.xprv, 0).xkeys.xprv, index).keys.prv;
    }
}

const web3$1 = new Web3();
class KeyPairEthereumPayments extends BaseEthereumPayments {
    constructor(config) {
        super(config);
        this.addresses = {};
        this.privateKeys = {};
        this.addressIndices = {};
        Object.entries(config.keyPairs).forEach(([key, value]) => {
            if (typeof value === 'undefined' || value === null) {
                return;
            }
            const i = Number.parseInt(key);
            let address;
            let pkey = null;
            if (web3$1.utils.isAddress(value)) {
                address = value;
            }
            else if (this.isValidPrivateKey(value)) {
                address = this.privateKeyToAddress(value).toLowerCase();
            }
            else if (this.isValidXprv(value)) {
                const signatory = deriveSignatory(value);
                address = signatory.address;
                pkey = signatory.keys.prv;
            }
            else {
                throw new Error(`KeyPairEthereumPaymentsConfig.keyPairs[${i}] is not a valid private key or address`);
            }
            if (typeof this.addressIndices[address] === 'number') {
                return;
            }
            this.addresses[i] = address;
            this.privateKeys[i] = pkey;
            this.addressIndices[address] = i;
        });
    }
    getPublicConfig() {
        return {
            ...omit(this.getFullConfig(), ['logger', 'fullNode', 'solidityNode', 'eventServer', 'keyPairs']),
            keyPairs: this.addresses,
        };
    }
    getAccountId(index) {
        const accountId = this.addresses[index] || '';
        if (!accountId) {
            throw new Error(`No KeyPairEthereumPayments account configured at index ${index}`);
        }
        return accountId;
    }
    getAccountIds() {
        return Object.keys(this.addressIndices);
    }
    async getPayport(index) {
        const address = this.addresses[index] || '';
        if (!await this.isValidAddress(address)) {
            throw new Error(`Cannot get address ${index} - keyPair[${index}] is undefined or invalid address`);
        }
        return { address };
    }
    async getPrivateKey(index) {
        const privateKey = this.privateKeys[index] || '';
        if (!this.isValidPrivateKey(privateKey)) {
            throw new Error(`Cannot get private key ${index} - keyPair[${index}] is undefined`);
        }
        return privateKey;
    }
}

const keys = type({
    pub: string,
    prv: string,
});
const xkeys = type({
    xprv: string,
    xpub: string,
});
const NullableOptionalString = union([string, null$1, undefined$1]);
const OptionalString = union([string, undefined$1]);
const EthereumSignatory = type({
    address: string,
    keys,
    xkeys,
}, 'EthereumSignatory');
const BaseEthereumPaymentsConfig = extendCodec(BaseConfig, {}, {
    fullNode: OptionalString,
    parityNode: OptionalString,
    gasStation: OptionalString,
}, 'BaseEthereumPaymentsConfig');
const HdEthereumPaymentsConfig = extendCodec(BaseEthereumPaymentsConfig, {
    hdKey: string,
}, 'HdEthereumPaymentsConfig');
const KeyPairEthereumPaymentsConfig = extendCodec(BaseEthereumPaymentsConfig, {
    keyPairs: union([array(NullableOptionalString), record(number, NullableOptionalString)]),
}, 'KeyPairEthereumPaymentsConfig');
const EthereumPaymentsConfig = union([HdEthereumPaymentsConfig, KeyPairEthereumPaymentsConfig], 'EthereumPaymentsConfig');
const EthereumUnsignedTransaction = extendCodec(BaseUnsignedTransaction, {
    id: string,
    amount: string,
    fee: string,
}, 'EthereumUnsignedTransaction');
const EthereumSignedTransaction = extendCodec(BaseSignedTransaction, {
    data: type({
        hex: string
    }),
}, {}, 'EthereumSignedTransaction');
const EthereumTransactionInfo = extendCodec(BaseTransactionInfo, {}, {}, 'EthereumTransactionInfo');
const EthereumBroadcastResult = extendCodec(BaseBroadcastResult, {}, 'EthereumBroadcastResult');
const EthereumResolvedFeeOption = extendCodec(ResolvedFeeOption, {
    gasPrice: string,
}, 'EthereumResolvedFeeOption');
const BnRounding = union([
    literal(1),
    literal(2),
    literal(3),
    literal(4),
    literal(5),
    literal(6),
    literal(7),
    literal(8),
]);
const BaseDenominationOptions = extendCodec(object, {}, {
    rounding: BnRounding
}, 'BaseDenominationOptions');

class EthereumPaymentsFactory {
    forConfig(config) {
        if (HdEthereumPaymentsConfig.is(config)) {
            return new HdEthereumPayments(config);
        }
        if (KeyPairEthereumPaymentsConfig.is(config)) {
            return new KeyPairEthereumPayments(config);
        }
        throw new Error('Cannot instantiate ethereum payments for unsupported config');
    }
}

export { BaseDenominationOptions, BaseEthereumPayments, BaseEthereumPaymentsConfig, CONTRACT_DEPLOY_COST, DECIMAL_PLACES, DEFAULT_EVENT_SERVER, DEFAULT_FEE_LEVEL, DEFAULT_FULL_NODE, DEFAULT_GAS_PRICE_IN_WEI, DEFAULT_SOLIDITY_NODE, ETHEREUM_TRANSFER_COST, EthereumBroadcastResult, EthereumPaymentsConfig, EthereumPaymentsFactory, EthereumPaymentsUtils, EthereumResolvedFeeOption, EthereumSignatory, EthereumSignedTransaction, EthereumTransactionInfo, EthereumUnsignedTransaction, FEE_LEVEL_MAP, GAS_STATION_URL, HdEthereumPayments, HdEthereumPaymentsConfig, KeyPairEthereumPayments, KeyPairEthereumPaymentsConfig, MIN_CONFIRMATIONS, PACKAGE_NAME, PRICES, SPEED, TOKEN_SWEEP_COST, TOKEN_TRANSFER_COST, deriveSignatory, isValidXkey };
//# sourceMappingURL=index.es.js.map
