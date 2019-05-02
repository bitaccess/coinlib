import TronWeb from 'tronweb';
import { pick, get, cloneDeep, set } from 'lodash';
import { HDPrivateKey, HDPublicKey } from 'bitcore-lib';
import { keccak256 } from 'js-sha3';
import jsSHA from 'jssha';
import { ec } from 'elliptic';
import { partial, string, number, union, array, null, undefined as undefined$1, record, boolean } from 'io-ts';
import { isType, extendCodec } from '@faast/ts-common';
import { FeeLevel, TransactionStatus, FeeRateType, FeeOptionCustom, BaseTransactionInfo, BaseUnsignedTransaction, BaseSignedTransaction, BaseBroadcastResult } from '@faast/payments-common';
export { CreateTransactionOptions } from '@faast/payments-common';

function toError(e) {
    if (typeof e === 'string') {
        return new Error(e);
    }
    return e;
}
function toMainDenominationNumber(amountSun) {
    const baseUnits = typeof amountSun === 'number' ? amountSun : Number.parseInt(amountSun);
    if (Number.isNaN(baseUnits)) {
        throw new Error('Cannot convert to main denomination - not a number');
    }
    if (!Number.isFinite(baseUnits)) {
        throw new Error('Cannot convert to main denomination - not finite');
    }
    return baseUnits / 1e6;
}
function toMainDenomination(amountSun) {
    return toMainDenominationNumber(amountSun).toString();
}
function toBaseDenominationNumber(amountTrx) {
    const mainUnits = typeof amountTrx === 'number' ? amountTrx : Number.parseFloat(amountTrx);
    if (Number.isNaN(mainUnits)) {
        throw new Error('Cannot convert to base denomination - not a number');
    }
    if (!Number.isFinite(mainUnits)) {
        throw new Error('Cannot convert to base denomination - not finite');
    }
    return Math.floor(mainUnits * 1e6);
}
function toBaseDenomination(amountTrx) {
    return toBaseDenominationNumber(amountTrx).toString();
}
function isValidXprv(xprv) {
    return xprv.startsWith('xprv');
}
function isValidXpub(xpub) {
    return xpub.startsWith('xpub');
}

const FEE_FOR_TRANSFER_SUN = 100000;
const FEE_LEVEL_TRANSFER_SUN = {
    [FeeLevel.Low]: FEE_FOR_TRANSFER_SUN,
    [FeeLevel.Medium]: FEE_FOR_TRANSFER_SUN,
    [FeeLevel.High]: FEE_FOR_TRANSFER_SUN,
};
const DEFAULT_FULL_NODE = process.env.TRX_FULL_NODE_URL || 'http://54.236.37.243:8090';
const DEFAULT_SOLIDITY_NODE = process.env.TRX_SOLIDITY_NODE_URL || 'http://47.89.187.247:8091';
const DEFAULT_EVENT_SERVER = process.env.TRX_EVENT_SERVER_URL || 'https://api.trongrid.io';
const DEFAULT_MAX_ADDRESS_SCAN = 10;

class BaseTronPayments {
    constructor(config) {
        this.toMainDenomination = toMainDenomination;
        this.toBaseDenomination = toBaseDenomination;
        this.fullNode = config.fullNode || DEFAULT_FULL_NODE;
        this.solidityNode = config.solidityNode || DEFAULT_SOLIDITY_NODE;
        this.eventServer = config.eventServer || DEFAULT_EVENT_SERVER;
        this.tronweb = new TronWeb(this.fullNode, this.solidityNode, this.eventServer);
    }
    isValidAddress(address) {
        return this.tronweb.isAddress(address);
    }
    isValidPrivateKey(privateKey) {
        try {
            this.privateKeyToAddress(privateKey);
            return true;
        }
        catch (e) {
            return false;
        }
    }
    privateKeyToAddress(privateKey) {
        const address = this.tronweb.address.fromPrivateKey(privateKey);
        if (this.isValidAddress(address)) {
            return address;
        }
        else {
            throw new Error('Validation failed for address derived from private key');
        }
    }
    async getAddressOrNull(index, options) {
        try {
            return await this.getAddress(index, options);
        }
        catch (e) {
            return null;
        }
    }
    async getAddressIndexOrNull(address) {
        try {
            return await this.getAddressIndex(address);
        }
        catch (e) {
            return null;
        }
    }
    async getBalance(addressOrIndex) {
        try {
            const address = await this.resolveAddress(addressOrIndex);
            const balanceSun = await this.tronweb.trx.getBalance(address);
            return {
                balance: toMainDenomination(balanceSun).toString(),
                unconfirmedBalance: '0',
            };
        }
        catch (e) {
            throw toError(e);
        }
    }
    async canSweep(addressOrIndex) {
        const { balance } = await this.getBalance(addressOrIndex);
        return this.canSweepBalance(toBaseDenominationNumber(balance));
    }
    async resolveFeeOption(feeOption) {
        let targetFeeLevel;
        let targetFeeRate;
        let targetFeeRateType;
        let feeBase;
        if (isType(FeeOptionCustom, feeOption)) {
            targetFeeLevel = FeeLevel.Custom;
            targetFeeRate = feeOption.feeRate;
            targetFeeRateType = feeOption.feeRateType;
            if (feeOption.feeRateType === FeeRateType.Base) {
                feeBase = feeOption.feeRate;
            }
            else if (feeOption.feeRateType === FeeRateType.Main) {
                feeBase = toBaseDenomination(feeOption.feeRate);
            }
            else {
                throw new Error(`Unsupported feeRateType for TRX: ${feeOption.feeRateType}`);
            }
        }
        else {
            feeBase = FEE_LEVEL_TRANSFER_SUN[feeOption.feeLevel].toString();
            targetFeeLevel = feeOption.feeLevel;
            targetFeeRate = feeBase;
            targetFeeRateType = FeeRateType.Base;
        }
        const feeMain = toMainDenomination(feeBase);
        return {
            targetFeeLevel,
            targetFeeRate,
            targetFeeRateType,
            feeBase,
            feeMain,
        };
    }
    async createSweepTransaction(from, to, options = { feeLevel: FeeLevel.Medium }) {
        try {
            const { fromAddress, fromIndex, toAddress, toIndex } = await this.resolveFromTo(from, to);
            const { targetFeeLevel, targetFeeRate, targetFeeRateType, feeBase, feeMain } = await this.resolveFeeOption(options);
            const feeSun = Number.parseInt(feeBase);
            const balanceSun = await this.tronweb.trx.getBalance(fromAddress);
            const balanceTrx = toMainDenomination(balanceSun);
            if (!this.canSweepBalance(balanceSun)) {
                throw new Error(`Insufficient balance (${balanceTrx}) to sweep with fee of ${feeMain}`);
            }
            const amountSun = balanceSun - feeSun;
            const amountTrx = toMainDenomination(amountSun);
            const tx = await this.tronweb.transactionBuilder.sendTrx(toAddress, amountSun, fromAddress);
            return {
                id: tx.txID,
                fromAddress,
                toAddress,
                toExtraId: null,
                fromIndex,
                toIndex,
                amount: amountTrx,
                fee: feeMain,
                targetFeeLevel,
                targetFeeRate,
                targetFeeRateType,
                status: 'unsigned',
                data: tx,
            };
        }
        catch (e) {
            throw toError(e);
        }
    }
    async createTransaction(from, to, amountTrx, options = { feeLevel: FeeLevel.Medium }) {
        try {
            const { fromAddress, fromIndex, toAddress, toIndex } = await this.resolveFromTo(from, to);
            const { targetFeeLevel, targetFeeRate, targetFeeRateType, feeBase, feeMain } = await this.resolveFeeOption(options);
            const feeSun = Number.parseInt(feeBase);
            const balanceSun = await this.tronweb.trx.getBalance(fromAddress);
            const balanceTrx = toMainDenomination(balanceSun);
            const amountSun = toBaseDenominationNumber(amountTrx);
            if (balanceSun - feeSun < amountSun) {
                throw new Error(`Insufficient balance (${balanceTrx}) to send including fee of ${feeMain}`);
            }
            const tx = await this.tronweb.transactionBuilder.sendTrx(toAddress, amountSun, fromAddress);
            return {
                id: tx.txID,
                fromAddress,
                toAddress,
                toExtraId: null,
                fromIndex,
                toIndex,
                amount: amountTrx,
                fee: feeMain,
                targetFeeLevel,
                targetFeeRate,
                targetFeeRateType,
                status: 'unsigned',
                data: tx,
            };
        }
        catch (e) {
            throw toError(e);
        }
    }
    async signTransaction(unsignedTx) {
        try {
            const fromPrivateKey = await this.getPrivateKey(unsignedTx.fromIndex);
            const unsignedRaw = cloneDeep(unsignedTx.data);
            const signedTx = await this.tronweb.trx.sign(unsignedRaw, fromPrivateKey);
            return {
                ...unsignedTx,
                status: 'signed',
                data: signedTx,
            };
        }
        catch (e) {
            throw toError(e);
        }
    }
    async broadcastTransaction(tx) {
        try {
            const status = await this.tronweb.trx.sendRawTransaction(tx.data);
            let success = false;
            let rebroadcast = false;
            if (status.result || status.code === 'SUCCESS') {
                success = true;
            }
            else {
                try {
                    await this.tronweb.trx.getTransaction(tx.id);
                    success = true;
                    rebroadcast = true;
                }
                catch (e) { }
            }
            if (success) {
                return {
                    id: tx.id,
                    rebroadcast,
                };
            }
            else {
                let statusCode = status.code;
                if (status.code === 'DUP_TRANSACTION_ERROR') {
                    statusCode = 'DUP_TX_BUT_TX_NOT_FOUND_SO_PROBABLY_INVALID_TX_ERROR';
                }
                throw new Error(`Failed to broadcast transaction: ${status.code}`);
            }
        }
        catch (e) {
            throw toError(e);
        }
    }
    async getTransactionInfo(txid) {
        try {
            const [tx, txInfo, currentBlock] = await Promise.all([
                this.tronweb.trx.getTransaction(txid),
                this.tronweb.trx.getTransactionInfo(txid),
                this.tronweb.trx.getCurrentBlock(),
            ]);
            const { amountTrx, fromAddress, toAddress } = this.extractTxFields(tx);
            const [fromIndex, toIndex] = await Promise.all([
                this.getAddressIndexOrNull(fromAddress),
                this.getAddressIndexOrNull(toAddress),
            ]);
            const contractRet = get(tx, 'ret[0].contractRet');
            const isExecuted = contractRet === 'SUCCESS';
            const block = txInfo.blockNumber;
            const feeTrx = toMainDenomination(txInfo.fee || 0);
            const currentBlockNumber = get(currentBlock, 'block_header.raw_data.number', 0);
            const confirmations = currentBlockNumber && block ? currentBlockNumber - block : 0;
            const isConfirmed = confirmations > 0;
            const date = new Date(tx.raw_data.timestamp);
            let status = TransactionStatus.Pending;
            if (isConfirmed) {
                if (!isExecuted) {
                    status = TransactionStatus.Failed;
                }
                status = TransactionStatus.Confirmed;
            }
            return {
                id: tx.txID,
                amount: amountTrx,
                toAddress,
                fromAddress,
                toExtraId: null,
                fromIndex,
                toIndex,
                block,
                fee: feeTrx,
                isExecuted,
                isConfirmed,
                confirmations,
                date,
                status,
                data: {
                    ...tx,
                    ...txInfo,
                    currentBlock: pick(currentBlock, 'block_header', 'blockID'),
                },
            };
        }
        catch (e) {
            throw toError(e);
        }
    }
    canSweepBalance(balanceSun) {
        return balanceSun - FEE_FOR_TRANSFER_SUN > 0;
    }
    extractTxFields(tx) {
        const contractParam = get(tx, 'raw_data.contract[0].parameter.value');
        if (!(contractParam && typeof contractParam.amount === 'number')) {
            throw new Error('Unable to get transaction');
        }
        const amountSun = contractParam.amount || 0;
        const amountTrx = toMainDenomination(amountSun);
        const toAddress = this.tronweb.address.fromHex(contractParam.to_address);
        const fromAddress = this.tronweb.address.fromHex(contractParam.owner_address);
        return {
            amountTrx,
            amountSun,
            toAddress,
            fromAddress,
        };
    }
    async resolveAddress(addressOrIndex) {
        if (typeof addressOrIndex === 'number') {
            return this.getAddress(addressOrIndex);
        }
        else {
            if (!this.isValidAddress(addressOrIndex)) {
                throw new Error(`Invalid TRON address: ${addressOrIndex}`);
            }
            return addressOrIndex;
        }
    }
    async resolveFromTo(from, to) {
        const fromIndex = typeof from === 'string' ? await this.getAddressIndex(from) : from;
        return {
            fromAddress: await this.resolveAddress(from),
            fromIndex,
            toAddress: await this.resolveAddress(to),
            toIndex: typeof to === 'string' ? await this.getAddressIndexOrNull(to) : to,
        };
    }
}
BaseTronPayments.toMainDenomination = toMainDenomination;
BaseTronPayments.toBaseDenomination = toBaseDenomination;

class Bip44Cache {
    constructor() {
        this.store = {};
    }
    put(xpub, index, address) {
        set(this.store, [xpub, 'addresses', index], address);
        set(this.store, [xpub, 'indices', address], index);
    }
    lookupIndex(xpub, address) {
        return get(this.store, [xpub, 'indices', address]);
    }
    lookupAddress(xpub, index) {
        return get(this.store, [xpub, 'addresses', index]);
    }
}

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const ALPHABET_MAP = {};
for (let i = 0; i < ALPHABET.length; i++) {
    ALPHABET_MAP[ALPHABET.charAt(i)] = i;
}
const BASE = 58;
function encode58(buffer) {
    if (buffer.length === 0) {
        return '';
    }
    let i;
    let j;
    const digits = [0];
    for (i = 0; i < buffer.length; i++) {
        for (j = 0; j < digits.length; j++) {
            digits[j] <<= 8;
        }
        digits[0] += buffer[i];
        let carry = 0;
        for (j = 0; j < digits.length; ++j) {
            digits[j] += carry;
            carry = (digits[j] / BASE) | 0;
            digits[j] %= BASE;
        }
        while (carry) {
            digits.push(carry % BASE);
            carry = (carry / BASE) | 0;
        }
    }
    for (i = 0; buffer[i] === 0 && i < buffer.length - 1; i++) {
        digits.push(0);
    }
    return digits
        .reverse()
        .map(digit => ALPHABET[digit])
        .join('');
}
function decode58(s) {
    if (s.length === 0) {
        return [];
    }
    let i;
    let j;
    const bytes = [0];
    for (i = 0; i < s.length; i++) {
        const c = s[i];
        if (!(c in ALPHABET_MAP)) {
            throw new Error('Non-base58 character');
        }
        for (j = 0; j < bytes.length; j++) {
            bytes[j] *= BASE;
        }
        bytes[0] += ALPHABET_MAP[c];
        let carry = 0;
        for (j = 0; j < bytes.length; ++j) {
            bytes[j] += carry;
            carry = bytes[j] >> 8;
            bytes[j] &= 0xff;
        }
        while (carry) {
            bytes.push(carry & 0xff);
            carry >>= 8;
        }
    }
    for (i = 0; s[i] === '1' && i < s.length - 1; i++) {
        bytes.push(0);
    }
    return bytes.reverse();
}

const ec$1 = new ec('secp256k1');
const derivationPath = "m/44'/195'/0";
const derivationPathParts = derivationPath.split('/').slice(1);
function deriveAddress(xpub, index) {
    const key = new HDPublicKey(xpub);
    const derived = deriveBasePath(key).derive(index);
    return hdPublicKeyToAddress(derived);
}
function derivePrivateKey(xprv, index) {
    const key = new HDPrivateKey(xprv);
    const derived = deriveBasePath(key).derive(index);
    return hdPrivateKeyToPrivateKey(derived);
}
function xprvToXpub(xprv) {
    const key = xprv instanceof HDPrivateKey ? xprv : new HDPrivateKey(xprv);
    const derivedPubKey = deriveBasePath(key).hdPublicKey;
    return derivedPubKey.toString();
}
function deriveBasePath(key) {
    const parts = derivationPathParts.slice(key.depth);
    if (parts.length > 0) {
        return key.derive(`m/${parts.join('/')}`);
    }
    return key;
}
function hdPublicKeyToAddress(key) {
    return addressBytesToB58CheckAddress(pubBytesToTronBytes(bip32PublicToTronPublic(key.publicKey.toBuffer())));
}
function hdPrivateKeyToPrivateKey(key) {
    return bip32PrivateToTronPrivate(key.privateKey.toBuffer());
}
function bip32PublicToTronPublic(pubKey) {
    const pubkey = ec$1.keyFromPublic(pubKey).getPublic();
    const x = pubkey.x;
    const y = pubkey.y;
    let xHex = x.toString('hex');
    while (xHex.length < 64) {
        xHex = `0${xHex}`;
    }
    let yHex = y.toString('hex');
    while (yHex.length < 64) {
        yHex = `0${yHex}`;
    }
    const pubkeyHex = `04${xHex}${yHex}`;
    const pubkeyBytes = hexStr2byteArray(pubkeyHex);
    return pubkeyBytes;
}
function bip32PrivateToTronPrivate(priKeyBytes) {
    const key = ec$1.keyFromPrivate(priKeyBytes, 'bytes');
    const privkey = key.getPrivate();
    let priKeyHex = privkey.toString('hex');
    while (priKeyHex.length < 64) {
        priKeyHex = `0${priKeyHex}`;
    }
    let privArray = hexStr2byteArray(priKeyHex);
    return byteArray2hexStr(privArray);
}
const ADDRESS_PREFIX = '41';
function byte2hexStr(byte) {
    const hexByteMap = '0123456789ABCDEF';
    let str = '';
    str += hexByteMap.charAt(byte >> 4);
    str += hexByteMap.charAt(byte & 0x0f);
    return str;
}
function hexStr2byteArray(str) {
    const byteArray = Array();
    let d = 0;
    let j = 0;
    let k = 0;
    for (let i = 0; i < str.length; i++) {
        const c = str.charAt(i);
        if (isHexChar(c)) {
            d <<= 4;
            d += hexChar2byte(c);
            j++;
            if (0 === j % 2) {
                byteArray[k++] = d;
                d = 0;
            }
        }
    }
    return byteArray;
}
function isHexChar(c) {
    return (c >= 'A' && c <= 'F') || (c >= 'a' && c <= 'f') || (c >= '0' && c <= '9');
}
function hexChar2byte(c) {
    let d = 0;
    if (c >= 'A' && c <= 'F') {
        d = c.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
    }
    else if (c >= 'a' && c <= 'f') {
        d = c.charCodeAt(0) - 'a'.charCodeAt(0) + 10;
    }
    else if (c >= '0' && c <= '9') {
        d = c.charCodeAt(0) - '0'.charCodeAt(0);
    }
    return d;
}
function byteArray2hexStr(byteArray) {
    let str = '';
    for (let i = 0; i < byteArray.length; i++) {
        str += byte2hexStr(byteArray[i]);
    }
    return str;
}
function pubBytesToTronBytes(pubBytes) {
    if (pubBytes.length === 65) {
        pubBytes = pubBytes.slice(1);
    }
    const hash = keccak256(pubBytes).toString();
    const addressHex = ADDRESS_PREFIX + hash.substring(24);
    return hexStr2byteArray(addressHex);
}
function addressBytesToB58CheckAddress(addressBytes) {
    const hash0 = SHA256(addressBytes);
    const hash1 = SHA256(hash0);
    let checkSum = hash1.slice(0, 4);
    checkSum = addressBytes.concat(checkSum);
    return encode58(checkSum);
}
function SHA256(msgBytes) {
    const shaObj = new jsSHA('SHA-256', 'HEX');
    const msgHex = byteArray2hexStr(msgBytes);
    shaObj.update(msgHex);
    const hashHex = shaObj.getHash('HEX');
    return hexStr2byteArray(hashHex);
}

const xpubCache = new Bip44Cache();
class HdTronPayments extends BaseTronPayments {
    constructor(config) {
        super(config);
        this.hdKey = config.hdKey;
        this.maxAddressScan = config.maxAddressScan || DEFAULT_MAX_ADDRESS_SCAN;
        if (!(isValidXprv(this.hdKey) || isValidXpub(this.hdKey))) {
            throw new Error('Account must be a valid xprv or xpub');
        }
    }
    static generateNewKeys() {
        const key = new HDPrivateKey();
        const xprv = key.toString();
        const xpub = xprvToXpub(xprv);
        return {
            xprv,
            xpub,
        };
    }
    getXpub() {
        return isValidXprv(this.hdKey) ? xprvToXpub(this.hdKey) : this.hdKey;
    }
    async getAddress(index, options = {}) {
        const cacheIndex = options.cacheIndex || true;
        const xpub = this.getXpub();
        const address = deriveAddress(xpub, index);
        if (!this.isValidAddress(address)) {
            throw new Error(`Cannot get address ${index} - validation failed for derived address`);
        }
        if (cacheIndex) {
            xpubCache.put(xpub, index, address);
        }
        return address;
    }
    async getAddressIndex(address) {
        const xpub = this.getXpub();
        const cachedIndex = xpubCache.lookupIndex(xpub, address);
        if (cachedIndex) {
            return cachedIndex;
        }
        for (let i = 0; i < this.maxAddressScan; i++) {
            if (address === deriveAddress(xpub, i)) {
                xpubCache.put(xpub, i, address);
                return i;
            }
        }
        throw new Error('Cannot get index of address after checking cache and scanning addresses' +
            ` from 0 to ${this.maxAddressScan - 1} (address=${address})`);
    }
    async getPrivateKey(index) {
        if (!isValidXprv(this.hdKey)) {
            throw new Error(`Cannot get private key ${index} - account is not a valid xprv)`);
        }
        return derivePrivateKey(this.hdKey, index);
    }
}

class KeyPairTronPayments extends BaseTronPayments {
    constructor(config) {
        super(config);
        this.addresses = {};
        this.privateKeys = {};
        this.addressIndices = {};
        Object.entries(config.keyPairs).forEach(([iString, addressOrKey]) => {
            if (typeof addressOrKey === 'undefined' || addressOrKey === null) {
                return;
            }
            const i = Number.parseInt(iString);
            if (this.isValidAddress(addressOrKey)) {
                this.addresses[i] = addressOrKey;
                this.privateKeys[i] = null;
                this.addressIndices[addressOrKey] = i;
                return;
            }
            if (this.isValidPrivateKey(addressOrKey)) {
                const address = this.privateKeyToAddress(addressOrKey);
                this.addresses[i] = address;
                this.privateKeys[i] = addressOrKey;
                this.addressIndices[address] = i;
                return;
            }
            throw new Error(`keyPairs[${i}] is not a valid private key or address`);
        });
    }
    async getAddress(index) {
        const address = this.addresses[index];
        if (typeof address === 'undefined') {
            throw new Error(`Cannot get address ${index} - keyPair[${index}] is undefined`);
        }
        return address;
    }
    async getAddressIndex(address) {
        const index = this.addressIndices[address];
        if (typeof index === 'undefined') {
            throw new Error(`Cannot get index of address ${address}`);
        }
        return index;
    }
    async getPrivateKey(index) {
        const privateKey = this.privateKeys[index];
        if (typeof privateKey === 'undefined') {
            throw new Error(`Cannot get private key ${index} - keyPair[${index}] is undefined`);
        }
        if (privateKey === null) {
            throw new Error(`Cannot get private key ${index} - keyPair[${index}] is a public address`);
        }
        return privateKey;
    }
}

class TronPaymentsFactory {
    forConfig(config) {
        if (config.hdKey) {
            return new HdTronPayments(config);
        }
        if (config.keyPairs) {
            return new KeyPairTronPayments(config);
        }
        throw new Error('Cannot instantiate tron payments for unsupported config');
    }
}

const BaseTronPaymentsConfig = partial({
    fullNode: string,
    solidityNode: string,
    eventServer: string,
}, 'BaseTronPaymentsConfig');
const HdTronPaymentsConfig = extendCodec(BaseTronPaymentsConfig, {
    hdKey: string,
}, {
    maxAddressScan: number,
}, 'HdTronPaymentsConfig');
const KeyPairTronPaymentsConfig = extendCodec(BaseTronPaymentsConfig, {
    keyPairs: union([array(union([string, null, undefined$1])), record(number, string)]),
}, {}, 'KeyPairTronPaymentsConfig');
const TronPaymentsConfig = union([HdTronPaymentsConfig, KeyPairTronPaymentsConfig]);
const TronUnsignedTransaction = extendCodec(BaseUnsignedTransaction, {
    id: string,
    amount: string,
    fee: string,
}, {}, 'TronUnsignedTransaction');
const TronSignedTransaction = extendCodec(BaseSignedTransaction, {}, {}, 'TronSignedTransaction');
const TronTransactionInfo = extendCodec(BaseTransactionInfo, {}, {}, 'TronTransactionInfo');
const TronBroadcastResult = extendCodec(BaseBroadcastResult, {
    rebroadcast: boolean,
}, {}, 'TronBroadcastResult');
const GetAddressOptions = partial({
    cacheIndex: boolean,
});

export { BaseTronPayments, HdTronPayments, KeyPairTronPayments, TronPaymentsFactory, BaseTronPaymentsConfig, HdTronPaymentsConfig, KeyPairTronPaymentsConfig, TronPaymentsConfig, TronUnsignedTransaction, TronSignedTransaction, TronTransactionInfo, TronBroadcastResult, GetAddressOptions, toError, toMainDenominationNumber, toMainDenomination, toBaseDenominationNumber, toBaseDenomination, isValidXprv, isValidXpub, derivationPath, deriveAddress, derivePrivateKey, xprvToXpub, encode58, decode58, FEE_FOR_TRANSFER_SUN, FEE_LEVEL_TRANSFER_SUN, DEFAULT_FULL_NODE, DEFAULT_SOLIDITY_NODE, DEFAULT_EVENT_SERVER, DEFAULT_MAX_ADDRESS_SCAN };
//# sourceMappingURL=index.es.js.map
