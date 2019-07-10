import TronWeb from 'tronweb';
import { pick, get, cloneDeep, set } from 'lodash';
import { HDPrivateKey, HDPublicKey } from 'bitcore-lib';
import { keccak256 } from 'js-sha3';
import jsSHA from 'jssha';
import { ec } from 'elliptic';
import { string, number, union, null, undefined as undefined$1, array, record, boolean, partial } from 'io-ts';
import { isType, extendCodec } from '@faast/ts-common';
import { TransactionStatus, FeeLevel, FeeRateType, FeeOptionCustom, BaseTransactionInfo, BaseUnsignedTransaction, BaseSignedTransaction, BaseBroadcastResult, BaseConfig } from '@faast/payments-common';
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
function isValidAddress(address) {
    return TronWeb.isAddress(address);
}
function isValidPrivateKey(privateKey) {
    try {
        privateKeyToAddress(privateKey);
        return true;
    }
    catch (e) {
        return false;
    }
}
function privateKeyToAddress(privateKey) {
    const address = TronWeb.address.fromPrivateKey(privateKey);
    if (isValidAddress(address)) {
        return address;
    }
    else {
        throw new Error('Validation failed for address derived from private key');
    }
}

const MIN_BALANCE_SUN = 100000;
const MIN_BALANCE_TRX = MIN_BALANCE_SUN / 1e6;
const DEFAULT_FULL_NODE = process.env.TRX_FULL_NODE_URL || 'https://api.trongrid.io';
const DEFAULT_SOLIDITY_NODE = process.env.TRX_SOLIDITY_NODE_URL || 'https://api.trongrid.io';
const DEFAULT_EVENT_SERVER = process.env.TRX_EVENT_SERVER_URL || 'https://api.trongrid.io';
const DEFAULT_MAX_ADDRESS_SCAN = 10;

class BaseTronPayments {
    constructor(config) {
        this.toMainDenomination = toMainDenomination;
        this.toBaseDenomination = toBaseDenomination;
        this.isValidAddress = isValidAddress;
        this.isValidPrivateKey = isValidPrivateKey;
        this.privateKeyToAddress = privateKeyToAddress;
        this.fullNode = config.fullNode || DEFAULT_FULL_NODE;
        this.solidityNode = config.solidityNode || DEFAULT_SOLIDITY_NODE;
        this.eventServer = config.eventServer || DEFAULT_EVENT_SERVER;
        this.tronweb = new TronWeb(this.fullNode, this.solidityNode, this.eventServer);
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
            const sweepable = this.canSweepBalance(balanceSun);
            return {
                confirmedBalance: toMainDenomination(balanceSun).toString(),
                unconfirmedBalance: '0',
                sweepable,
            };
        }
        catch (e) {
            throw toError(e);
        }
    }
    async resolveFeeOption(feeOption) {
        let targetFeeLevel;
        if (isType(FeeOptionCustom, feeOption)) {
            if (feeOption.feeRate !== '0') {
                throw new Error('tron-payments custom fees are unsupported');
            }
            targetFeeLevel = FeeLevel.Custom;
        }
        else {
            targetFeeLevel = feeOption.feeLevel;
        }
        return {
            targetFeeLevel,
            targetFeeRate: '0',
            targetFeeRateType: FeeRateType.Base,
            feeBase: '0',
            feeMain: '0',
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
                throw new Error(`Insufficient balance (${balanceTrx}) to sweep with fee of ${feeMain} ` +
                    `while maintaining a minimum required balance of ${MIN_BALANCE_TRX}`);
            }
            const amountSun = balanceSun - feeSun - MIN_BALANCE_SUN;
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
            if (balanceSun - feeSun - MIN_BALANCE_SUN < amountSun) {
                throw new Error(`Insufficient balance (${balanceTrx}) to send ${amountTrx} including fee of ${feeMain} ` +
                    `while maintaining a minimum required balance of ${MIN_BALANCE_TRX}`);
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
                if (statusCode === 'DUP_TRANSACTION_ERROR') {
                    statusCode = 'DUP_TX_BUT_TX_NOT_FOUND_SO_PROBABLY_INVALID_TX_ERROR';
                }
                throw new Error(`Failed to broadcast transaction: ${statusCode}`);
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
            const block = txInfo.blockNumber || null;
            const feeTrx = toMainDenomination(txInfo.fee || 0);
            const currentBlockNumber = get(currentBlock, 'block_header.raw_data.number', 0);
            const confirmations = currentBlockNumber && block ? currentBlockNumber - block : 0;
            const isConfirmed = confirmations > 0;
            const confirmationTimestamp = txInfo.blockTimeStamp ? new Date(txInfo.blockTimeStamp) : null;
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
                fee: feeTrx,
                isExecuted,
                isConfirmed,
                confirmations,
                confirmationId: block ? String(block) : null,
                confirmationTimestamp,
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
        return balanceSun > MIN_BALANCE_SUN;
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
const derivationPath = "m/44'/195'/0'";
const derivationPathParts = derivationPath.split('/').slice(1);
function deriveAddress(xpub, index) {
    const key = new HDPublicKey(xpub);
    const derived = deriveBasePath(key)
        .derive(0)
        .derive(index);
    return hdPublicKeyToAddress(derived);
}
function derivePrivateKey(xprv, index) {
    const key = new HDPrivateKey(xprv);
    const derived = deriveBasePath(key)
        .derive(0)
        .derive(index);
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
        this.config = config;
        this.maxAddressScan = config.maxAddressScan || DEFAULT_MAX_ADDRESS_SCAN;
        if (isValidXprv(config.hdKey)) {
            this.xprv = config.hdKey;
            this.xpub = xprvToXpub(this.xprv);
        }
        else if (isValidXpub(config.hdKey)) {
            this.xprv = null;
            this.xpub = config.hdKey;
        }
        else {
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
        return this.xpub;
    }
    getFullConfig() {
        return this.config;
    }
    getPublicConfig() {
        return {
            ...this.config,
            hdKey: this.getXpub(),
        };
    }
    getAccountId(index) {
        return this.getXpub();
    }
    getAccountIds() {
        return [this.getXpub()];
    }
    async getAddress(index, options = {}) {
        const cacheIndex = options.cacheIndex || true;
        const xpub = this.getXpub();
        const address = deriveAddress(xpub, index);
        if (!isValidAddress(address)) {
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
        if (!this.xprv) {
            throw new Error(`Cannot get private key ${index} - HdTronPayments was created with an xpub`);
        }
        return derivePrivateKey(this.xprv, index);
    }
}

class KeyPairTronPayments extends BaseTronPayments {
    constructor(config) {
        super(config);
        this.config = config;
        this.addresses = {};
        this.privateKeys = {};
        this.addressIndices = {};
        Object.entries(config.keyPairs).forEach(([iString, addressOrKey]) => {
            if (typeof addressOrKey === 'undefined' || addressOrKey === null) {
                return;
            }
            const i = Number.parseInt(iString);
            if (isValidAddress(addressOrKey)) {
                this.addresses[i] = addressOrKey;
                this.privateKeys[i] = null;
                this.addressIndices[addressOrKey] = i;
                return;
            }
            if (isValidPrivateKey(addressOrKey)) {
                const address = privateKeyToAddress(addressOrKey);
                this.addresses[i] = address;
                this.privateKeys[i] = addressOrKey;
                this.addressIndices[address] = i;
                return;
            }
            throw new Error(`KeyPairTronPaymentsConfig.keyPairs[${i}] is not a valid private key or address`);
        });
    }
    getFullConfig() {
        return this.config;
    }
    getPublicConfig() {
        return {
            ...this.config,
            keyPairs: this.addresses,
        };
    }
    getAccountId(index) {
        const accountId = this.addresses[index];
        if (!accountId) {
            throw new Error(`No KeyPairTronPayments account configured at index ${index}`);
        }
        return accountId;
    }
    getAccountIds() {
        return Object.keys(this.addressIndices);
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

const BaseTronPaymentsConfig = extendCodec(BaseConfig, {}, {
    fullNode: string,
    solidityNode: string,
    eventServer: string,
}, 'BaseTronPaymentsConfig');
const HdTronPaymentsConfig = extendCodec(BaseTronPaymentsConfig, {
    hdKey: string,
}, {
    maxAddressScan: number,
}, 'HdTronPaymentsConfig');
const NullableOptionalString = union([string, null, undefined$1]);
const KeyPairTronPaymentsConfig = extendCodec(BaseTronPaymentsConfig, {
    keyPairs: union([array(NullableOptionalString), record(number, NullableOptionalString)]),
}, 'KeyPairTronPaymentsConfig');
const TronPaymentsConfig = union([HdTronPaymentsConfig, KeyPairTronPaymentsConfig], 'TronPaymentsConfig');
const TronUnsignedTransaction = extendCodec(BaseUnsignedTransaction, {
    id: string,
    amount: string,
    fee: string,
}, 'TronUnsignedTransaction');
const TronSignedTransaction = extendCodec(BaseSignedTransaction, {}, {}, 'TronSignedTransaction');
const TronTransactionInfo = extendCodec(BaseTransactionInfo, {}, {}, 'TronTransactionInfo');
const TronBroadcastResult = extendCodec(BaseBroadcastResult, {
    rebroadcast: boolean,
}, 'TronBroadcastResult');
const GetAddressOptions = partial({
    cacheIndex: boolean,
});

class TronPaymentsFactory {
    forConfig(config) {
        if (HdTronPaymentsConfig.is(config)) {
            return new HdTronPayments(config);
        }
        if (KeyPairTronPaymentsConfig.is(config)) {
            return new KeyPairTronPayments(config);
        }
        throw new Error('Cannot instantiate tron payments for unsupported config');
    }
}

class TronAddressValidator {
    constructor() {
        this.validate = isValidAddress;
    }
}

export { BaseTronPayments, HdTronPayments, KeyPairTronPayments, TronPaymentsFactory, TronAddressValidator, BaseTronPaymentsConfig, HdTronPaymentsConfig, KeyPairTronPaymentsConfig, TronPaymentsConfig, TronUnsignedTransaction, TronSignedTransaction, TronTransactionInfo, TronBroadcastResult, GetAddressOptions, toError, toMainDenominationNumber, toMainDenomination, toBaseDenominationNumber, toBaseDenomination, isValidXprv, isValidXpub, isValidAddress, isValidPrivateKey, privateKeyToAddress, derivationPath, deriveAddress, derivePrivateKey, xprvToXpub, encode58, decode58, MIN_BALANCE_SUN, MIN_BALANCE_TRX, DEFAULT_FULL_NODE, DEFAULT_SOLIDITY_NODE, DEFAULT_EVENT_SERVER, DEFAULT_MAX_ADDRESS_SCAN };
//# sourceMappingURL=index.es.js.map
