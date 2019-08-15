import BigNumber from 'bignumber.js';
import { union, string, nullType, number, type, boolean, object } from 'io-ts';
import { RippleAPI } from 'ripple-lib';
import { fromBase58, fromSeed } from 'bip32';
import baseX from 'base-x';
import crypto from 'crypto';
import { BaseTransactionInfo, BaseUnsignedTransaction, BaseSignedTransaction, BaseBroadcastResult, CreateTransactionOptions, BaseConfig, createUnitConverters, NetworkType, Payport, FeeLevel, FeeRateType, TransactionStatus, BalanceMonitor } from '@faast/payments-common';
export { CreateTransactionOptions } from '@faast/payments-common';
import { isString, isUndefined, isNumber } from 'util';
import { extendCodec, instanceofCodec, nullable, isNil, DelegateLogger, assertType } from '@faast/ts-common';

const BaseRippleConfig = extendCodec(BaseConfig, {}, {
    server: union([string, instanceofCodec(RippleAPI), nullType]),
}, 'BaseRippleConfig');
const RippleBalanceMonitorConfig = BaseRippleConfig;
const BaseRipplePaymentsConfig = extendCodec(BaseRippleConfig, {}, {
    maxLedgerVersionOffset: number,
}, 'BaseRipplePaymentsConfig');
const HdRipplePaymentsConfig = extendCodec(BaseRipplePaymentsConfig, {
    hdKey: string,
}, 'HdRipplePaymentsConfig');
const RippleKeyPair = type({
    publicKey: string,
    privateKey: string,
}, 'RippleKeyPair');
const RippleSecretPair = type({
    address: string,
    secret: string,
}, 'RippleSecretPair');
const RippleAccountConfig = union([string, RippleSecretPair, RippleKeyPair], 'RippleAccountConfig');
const AccountRipplePaymentsConfig = extendCodec(BaseRipplePaymentsConfig, {
    hotAccount: RippleAccountConfig,
    depositAccount: RippleAccountConfig,
}, 'AccountRipplePaymentsConfig');
const RipplePaymentsConfig = union([HdRipplePaymentsConfig, AccountRipplePaymentsConfig], 'RipplePaymentsConfig');
const RippleUnsignedTransaction = extendCodec(BaseUnsignedTransaction, {
    amount: string,
    fee: string,
}, 'RippleUnsignedTransaction');
const RippleSignedTransaction = extendCodec(BaseSignedTransaction, {
    id: string,
}, 'RippleSignedTransaction');
const RippleTransactionInfo = extendCodec(BaseTransactionInfo, {
    confirmationNumber: nullable(number),
}, {}, 'RippleTransactionInfo');
const RippleBroadcastResult = extendCodec(BaseBroadcastResult, {
    rebroadcast: boolean,
    data: object,
}, 'RippleBroadcastResult');
const RippleCreateTransactionOptions = extendCodec(CreateTransactionOptions, {}, {
    maxLedgerVersionOffset: number,
    sequence: number,
    payportBalance: string,
}, 'RippleCreateTransactionOptions');

const PACKAGE_NAME = 'ripple-payments';
const DECIMAL_PLACES = 6;
const MIN_BALANCE = 20;
const DEFAULT_CREATE_TRANSACTION_OPTIONS = {};
const DEFAULT_MAX_LEDGER_VERSION_OFFSET = 100;
const ADDRESS_REGEX = /^r[1-9A-HJ-NP-Za-km-z]{25,34}$/;
const EXTRA_ID_REGEX = /^[0-9]+$/;
const XPUB_REGEX = /^xpub[a-km-zA-HJ-NP-Z1-9]{100,108}$/;
const XPRV_REGEX = /^xprv[a-km-zA-HJ-NP-Z1-9]{100,108}$/;
const NOT_FOUND_ERRORS = ['MissingLedgerHistoryError', 'NotFoundError'];
const DEFAULT_MAINNET_SERVER = 'wss://s1.ripple.com';
const DEFAULT_TESTNET_SERVER = 'wss://s.altnet.rippletest.net:51233';

const { toMainDenominationBigNumber, toMainDenominationString, toMainDenominationNumber, toBaseDenominationBigNumber, toBaseDenominationString, toBaseDenominationNumber, } = createUnitConverters(DECIMAL_PLACES);
function isValidXprv(xprv) {
    return typeof xprv === 'string' && XPRV_REGEX.test(xprv);
}
function isValidXpub(xpub) {
    return typeof xpub === 'string' && XPUB_REGEX.test(xpub);
}
function isValidAddress(address) {
    return typeof address === 'string' && ADDRESS_REGEX.test(address);
}
function isValidExtraId(extraId) {
    return typeof extraId === 'string' && EXTRA_ID_REGEX.test(extraId);
}
function assertValidAddress(address) {
    if (!isValidAddress(address)) {
        throw new Error(`Invalid ripple address: ${address}`);
    }
}
function assertValidExtraId(extraId) {
    if (!isValidExtraId(extraId)) {
        throw new Error(`Invalid ripple extraId: ${extraId}`);
    }
}
function assertValidExtraIdOrNil(extraId) {
    if (!isNil(extraId) && !isValidExtraId(extraId)) {
        throw new Error(`Invalid ripple extraId: ${extraId}`);
    }
}

class RipplePaymentsUtils {
    constructor(config = {}) {
        this.isValidXprv = isValidXprv;
        this.isValidXpub = isValidXpub;
        assertType(BaseConfig, config);
        this.networkType = config.network || NetworkType.Mainnet;
        this.logger = new DelegateLogger(config.logger, PACKAGE_NAME);
    }
    async isValidExtraId(extraId) {
        return isValidExtraId(extraId);
    }
    async isValidAddress(address) {
        return isValidAddress(address);
    }
    async isValidPayport(payport) {
        if (!Payport.is(payport)) {
            return false;
        }
        const { address, extraId } = payport;
        return (await this.isValidAddress(address)) && (isNil(extraId) ? true : this.isValidExtraId(extraId));
    }
    toMainDenomination(amount) {
        return toMainDenominationString(amount);
    }
    toBaseDenomination(amount) {
        return toBaseDenominationString(amount);
    }
}

function padLeft(x, n, v) {
    while (x.length < n) {
        x = `${v}${x}`;
    }
    return x;
}
function resolveRippleServer(server, network) {
    if (typeof server === 'undefined') {
        server = network === NetworkType.Testnet ? DEFAULT_TESTNET_SERVER : DEFAULT_MAINNET_SERVER;
    }
    if (isString(server)) {
        return new RippleAPI({
            server: server,
        });
    }
    else if (server instanceof RippleAPI) {
        return server;
    }
    else {
        return new RippleAPI();
    }
}

function extraIdToTag(extraId) {
    return isNil(extraId) ? undefined : Number.parseInt(extraId);
}
function serializePayport(payport) {
    return isNil(payport.extraId) ? payport.address : `${payport.address}:${payport.extraId}`;
}
class BaseRipplePayments extends RipplePaymentsUtils {
    constructor(config) {
        super(config);
        this.config = config;
        assertType(BaseRipplePaymentsConfig, config);
        this.rippleApi = resolveRippleServer(config.server, this.networkType);
    }
    async init() {
        if (!this.rippleApi.isConnected()) {
            await this.rippleApi.connect();
        }
    }
    async destroy() {
        if (this.rippleApi.isConnected()) {
            await this.rippleApi.disconnect();
        }
    }
    getFullConfig() {
        return this.config;
    }
    async resolvePayport(payport) {
        if (typeof payport === 'number') {
            return this.getPayport(payport);
        }
        else if (typeof payport === 'string') {
            assertValidAddress(payport);
            return { address: payport };
        }
        assertValidAddress(payport.address);
        assertValidExtraIdOrNil(payport.extraId);
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
    async getPayport(index) {
        if (index === 0) {
            return { address: this.getHotSignatory().address };
        }
        if (index === 1) {
            return { address: this.getDepositSignatory().address };
        }
        return { address: this.getDepositSignatory().address, extraId: String(index) };
    }
    requiresBalanceMonitor() {
        return true;
    }
    getAddressesToMonitor() {
        return [this.getHotSignatory().address, this.getDepositSignatory().address];
    }
    isSweepableAddressBalance(balance) {
        return new BigNumber(balance).gt(MIN_BALANCE);
    }
    async getBalance(payportOrIndex) {
        const payport = await this.resolvePayport(payportOrIndex);
        const { address, extraId } = payport;
        if (!isNil(extraId)) {
            throw new Error(`Cannot getBalance of ripple payport with extraId ${extraId}, use BalanceMonitor instead`);
        }
        const balances = await this.rippleApi.getBalances(address);
        const xrpBalance = balances.find(({ currency }) => currency === 'XRP');
        const xrpAmount = xrpBalance ? xrpBalance.value : '0';
        return {
            confirmedBalance: xrpAmount,
            unconfirmedBalance: '0',
            sweepable: this.isSweepableAddressBalance(xrpAmount),
        };
    }
    resolveIndexFromAdjustment(adjustment) {
        const { address, tag } = adjustment;
        if (address === this.getHotSignatory().address) {
            return 0;
        }
        else if (address === this.getDepositSignatory().address) {
            return tag || 1;
        }
        return null;
    }
    async getTransactionInfo(txId) {
        let tx;
        try {
            tx = await this.rippleApi.getTransaction(txId);
        }
        catch (e) {
            const eString = e.toString();
            if (NOT_FOUND_ERRORS.some(type$$1 => eString.includes(type$$1))) {
                throw new Error(`Transaction not found: ${eString}`);
            }
            throw e;
        }
        this.logger.debug('tx', JSON.stringify(tx, null, 2));
        if (tx.type !== 'payment') {
            throw new Error(`Unsupported ripple tx type ${tx.type}`);
        }
        const { specification, outcome } = tx;
        const { source, destination } = specification;
        const amountObject = (source.maxAmount || source.amount);
        if (amountObject.currency !== 'XRP') {
            throw new Error(`Unsupported ripple tx currency ${amountObject.currency}`);
        }
        const fromIndex = this.resolveIndexFromAdjustment(source);
        const toIndex = this.resolveIndexFromAdjustment(destination);
        const amount = amountObject.value;
        const status = outcome.result.startsWith('tes') ? TransactionStatus.Confirmed : TransactionStatus.Failed;
        const confirmationNumber = outcome.ledgerVersion;
        const ledger = await this.rippleApi.getLedger({ ledgerVersion: confirmationNumber });
        const currentLedgerVersion = await this.rippleApi.getLedgerVersion();
        const confirmationId = ledger.ledgerHash;
        const confirmationTimestamp = outcome.timestamp ? new Date(outcome.timestamp) : null;
        return {
            id: tx.id,
            fromIndex,
            fromAddress: source.address,
            fromExtraId: typeof source.tag !== 'undefined' ? String(source.tag) : null,
            toIndex,
            toAddress: destination.address,
            toExtraId: typeof destination.tag !== 'undefined' ? String(destination.tag) : null,
            amount: amount,
            fee: outcome.fee,
            status,
            confirmationId,
            confirmationNumber: ledger.ledgerVersion,
            confirmationTimestamp,
            isExecuted: status === 'confirmed',
            isConfirmed: true,
            confirmations: currentLedgerVersion - confirmationNumber,
            data: tx,
        };
    }
    async resolveFeeOption(feeOption) {
        let targetFeeLevel;
        let targetFeeRate;
        let targetFeeRateType;
        let feeMain;
        let feeBase;
        if (feeOption.feeLevel === FeeLevel.Custom) {
            targetFeeLevel = feeOption.feeLevel;
            targetFeeRate = feeOption.feeRate;
            targetFeeRateType = feeOption.feeRateType;
            if (targetFeeRateType === FeeRateType.Base) {
                feeBase = targetFeeRate;
                feeMain = this.toMainDenomination(feeBase);
            }
            else if (targetFeeRateType === FeeRateType.Main) {
                feeMain = targetFeeRate;
                feeBase = this.toBaseDenomination(feeMain);
            }
            else {
                throw new Error(`Unsupport ripple feeRateType ${feeOption.feeRateType}`);
            }
        }
        else {
            targetFeeLevel = feeOption.feeLevel || FeeLevel.Medium;
            let cushion;
            if (targetFeeLevel === FeeLevel.Low) {
                cushion = 1;
            }
            else if (targetFeeLevel === FeeLevel.Medium) {
                cushion = 1.2;
            }
            else if (targetFeeLevel === FeeLevel.High) {
                cushion = 1.5;
            }
            feeMain = await this.rippleApi.getFee(cushion);
            feeBase = this.toBaseDenomination(feeMain);
            targetFeeRate = feeMain;
            targetFeeRateType = FeeRateType.Main;
        }
        return {
            targetFeeLevel,
            targetFeeRate,
            targetFeeRateType,
            feeMain,
            feeBase,
        };
    }
    async resolvePayportBalance(fromPayport, options) {
        if (isNil(fromPayport.extraId)) {
            const balances = await this.getBalance(fromPayport);
            return new BigNumber(balances.confirmedBalance);
        }
        if (typeof options.payportBalance !== 'string') {
            throw new Error('ripple-payments createSweepTransaction missing required payportBalance option');
        }
        const payportBalance = new BigNumber(options.payportBalance);
        if (payportBalance.isNaN()) {
            throw new Error(`Invalid NaN payportBalance option provided: ${options.payportBalance}`);
        }
        return payportBalance;
    }
    async doCreateTransaction(fromTo, feeOption, amount, payportBalance, options) {
        if (amount.isNaN() || amount.lte(0)) {
            throw new Error(`Invalid amount provided to ripple-payments createTransaction: ${amount}`);
        }
        const { fromIndex, fromAddress, fromExtraId, fromPayport, toIndex, toAddress, toExtraId, toPayport } = fromTo;
        const { targetFeeLevel, targetFeeRate, targetFeeRateType, feeMain } = feeOption;
        const { sequence } = options;
        const maxLedgerVersionOffset = options.maxLedgerVersionOffset || this.config.maxLedgerVersionOffset || DEFAULT_MAX_LEDGER_VERSION_OFFSET;
        const amountString = amount.toString();
        const addressBalances = await this.getBalance({ address: fromAddress });
        const addressBalance = new BigNumber(addressBalances.confirmedBalance);
        if (addressBalance.lt(MIN_BALANCE)) {
            throw new Error(`Cannot send from ripple address that has less than ${MIN_BALANCE} XRP: ${fromAddress} (${addressBalance} XRP)`);
        }
        const totalValue = amount.plus(feeMain);
        if (addressBalance.minus(totalValue).lt(MIN_BALANCE)) {
            throw new Error(`Cannot send ${amountString} XRP with fee of ${feeMain} XRP because it would reduce the balance below ` +
                `the minimum required balance of ${MIN_BALANCE} XRP: ${fromAddress} (${addressBalance} XRP)`);
        }
        if (typeof fromExtraId === 'string' && totalValue.gt(payportBalance)) {
            throw new Error(`Insufficient payport balance of ${payportBalance} XRP to send ${amountString} XRP ` +
                `with fee of ${feeMain} XRP: ${serializePayport(fromPayport)}`);
        }
        const preparedTx = await this.rippleApi.preparePayment(fromAddress, {
            source: {
                address: fromAddress,
                tag: extraIdToTag(fromExtraId),
                maxAmount: {
                    currency: 'XRP',
                    value: amountString,
                },
            },
            destination: {
                address: toAddress,
                tag: extraIdToTag(toExtraId),
                amount: {
                    currency: 'XRP',
                    value: amountString,
                },
            },
        }, {
            maxLedgerVersionOffset,
            sequence,
        });
        return {
            id: null,
            fromIndex,
            fromAddress,
            fromExtraId,
            toIndex,
            toAddress,
            toExtraId,
            amount: amountString,
            targetFeeLevel,
            targetFeeRate,
            targetFeeRateType,
            fee: feeMain,
            status: TransactionStatus.Unsigned,
            data: preparedTx,
        };
    }
    async createTransaction(from, to, amount, options = DEFAULT_CREATE_TRANSACTION_OPTIONS) {
        const fromTo = await this.resolveFromTo(from, to);
        const feeOption = await this.resolveFeeOption(options);
        const payportBalance = await this.resolvePayportBalance(fromTo.fromPayport, options);
        const amountBn = new BigNumber(amount);
        return this.doCreateTransaction(fromTo, feeOption, amountBn, payportBalance, options);
    }
    async createSweepTransaction(from, to, options = DEFAULT_CREATE_TRANSACTION_OPTIONS) {
        const fromTo = await this.resolveFromTo(from, to);
        const feeOption = await this.resolveFeeOption(options);
        const payportBalance = await this.resolvePayportBalance(fromTo.fromPayport, options);
        let amountBn = payportBalance.minus(feeOption.feeMain);
        if (amountBn.lt(0)) {
            const fromPayport = { address: fromTo.fromAddress, extraId: fromTo.fromExtraId };
            throw new Error(`Insufficient balance to sweep from ripple payport with fee of ${feeOption.feeMain} XRP: ` +
                `${serializePayport(fromPayport)} (${payportBalance} XRP)`);
        }
        if (typeof fromTo.fromExtraId !== 'string') {
            amountBn = amountBn.minus(MIN_BALANCE);
            if (amountBn.lt(0)) {
                throw new Error(`Insufficient balance to sweep from ripple address with fee of ${feeOption.feeMain} XRP and ` +
                    `maintain the minimum required balance of ${MIN_BALANCE} XRP: ` +
                    `${fromTo.fromAddress} (${payportBalance} XRP)`);
            }
        }
        return this.doCreateTransaction(fromTo, feeOption, amountBn, payportBalance, options);
    }
    async signTransaction(unsignedTx) {
        assertType(RippleUnsignedTransaction, unsignedTx);
        if (this.isReadOnly()) {
            throw new Error('Cannot sign transaction with read only ripple payments (no xprv or secrets provided)');
        }
        this.logger.debug(unsignedTx.data);
        const { txJSON } = unsignedTx.data;
        let secret;
        const hotSignatory = this.getHotSignatory();
        const depositSignatory = this.getDepositSignatory();
        if (unsignedTx.fromAddress === hotSignatory.address) {
            secret = hotSignatory.secret;
        }
        else if (unsignedTx.fromAddress === depositSignatory.address) {
            secret = depositSignatory.secret;
        }
        else {
            throw new Error(`Cannot sign ripple transaction from address ${unsignedTx.fromAddress}`);
        }
        const signResult = this.rippleApi.sign(txJSON, secret);
        return {
            ...unsignedTx,
            id: signResult.id,
            data: signResult,
            status: TransactionStatus.Signed,
        };
    }
    async broadcastTransaction(signedTx) {
        assertType(RippleSignedTransaction, signedTx);
        const signedTxString = signedTx.data.signedTransaction;
        let rebroadcast = false;
        try {
            const existing = await this.getTransactionInfo(signedTx.id);
            rebroadcast = existing.id === signedTx.id;
        }
        catch (e) { }
        const result = (await this.rippleApi.submit(signedTxString));
        this.logger.debug('broadcasted', result);
        const resultCode = result.engine_result || result.resultCode || '';
        if (!resultCode.startsWith('tes')) {
            throw new Error(`Failed to broadcast ripple tx ${signedTx.id} with result code ${resultCode}`);
        }
        return {
            id: signedTx.id,
            rebroadcast,
            data: result,
        };
    }
}

const RIPPLE_B58_DICT = 'rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz';
const base58 = baseX(RIPPLE_B58_DICT);
const derivationPath = "m/44'/144'/0'";
const derivationPathParts = derivationPath.split('/').slice(1);
function deriveSignatory(hdKey, index) {
    const key = fromBase58(hdKey);
    const derived = deriveBasePath(key)
        .derive(0)
        .derive(index);
    const privateKey = derived.isNeutered() ? '' : hdNodeToPrivateKey(derived);
    const publicKey = hdNodeToPublicKey(derived);
    const address = publicKeyToAddress(publicKey);
    return {
        address,
        secret: {
            privateKey,
            publicKey,
        },
    };
}
function xprvToXpub(xprv) {
    const key = typeof xprv === 'string' ? fromBase58(xprv) : xprv;
    const derivedPubKey = deriveBasePath(key);
    return derivedPubKey.neutered().toBase58();
}
function generateNewKeys() {
    const key = fromSeed(crypto.randomBytes(32));
    const xprv = key.toBase58();
    const xpub = xprvToXpub(xprv);
    return {
        xprv,
        xpub,
    };
}
function deriveBasePath(key) {
    const parts = derivationPathParts.slice(key.depth);
    if (parts.length > 0) {
        return key.derivePath(`m/${parts.join('/')}`);
    }
    return key;
}
function hdNodeToPublicKey(key) {
    const hexKey = padLeft(key.publicKey.toString('hex'), 66, '0');
    return hexKey.toUpperCase();
}
function hdNodeToPrivateKey(key) {
    if (key.isNeutered() || typeof key.privateKey === 'undefined') {
        throw new Error('Cannot derive private key from neutered bip32 node');
    }
    const hexKey = padLeft(key.privateKey.toString('hex'), 64, '0');
    return hexKey.toUpperCase();
}
function publicKeyToAddress(pubkeyHex) {
    const pubkeyBuffer = Buffer.from(pubkeyHex, 'hex');
    const pubkeyInnerHash = crypto.createHash('sha256').update(pubkeyBuffer);
    const pubkeyOuterHash = crypto.createHash('ripemd160');
    pubkeyOuterHash.update(pubkeyInnerHash.digest());
    const accountId = pubkeyOuterHash.digest();
    const addressTypePrefix = Buffer.from([0x00]);
    const payload = Buffer.concat([addressTypePrefix, accountId]);
    const chksumHash1 = crypto
        .createHash('sha256')
        .update(payload)
        .digest();
    const chksumHash2 = crypto
        .createHash('sha256')
        .update(chksumHash1)
        .digest();
    const checksum = chksumHash2.slice(0, 4);
    const dataToEncode = Buffer.concat([payload, checksum]);
    const address = base58.encode(dataToEncode);
    return address;
}

class HdRipplePayments extends BaseRipplePayments {
    constructor(config) {
        super(config);
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
        this.hotSignatory = deriveSignatory(config.hdKey, 0);
        this.depositSignatory = deriveSignatory(config.hdKey, 1);
    }
    isReadOnly() {
        return this.xprv === null;
    }
    getPublicConfig() {
        return {
            ...this.config,
            hdKey: xprvToXpub(this.config.hdKey),
        };
    }
    getAccountIds() {
        return [this.xpub];
    }
    getAccountId(index) {
        return this.xpub;
    }
    getHotSignatory() {
        return this.hotSignatory;
    }
    getDepositSignatory() {
        return this.depositSignatory;
    }
}
HdRipplePayments.generateNewKeys = generateNewKeys;

class AccountRipplePayments extends BaseRipplePayments {
    constructor(config) {
        super(config);
        this.readOnly = false;
        assertType(AccountRipplePaymentsConfig, config);
        this.hotSignatory = this.accountConfigToSignatory(config.hotAccount);
        this.depositSignatory = this.accountConfigToSignatory(config.depositAccount);
    }
    accountConfigToSignatory(accountConfig) {
        if (RippleKeyPair.is(accountConfig)) {
            if (!accountConfig.privateKey) {
                this.readOnly = true;
            }
            const address = this.rippleApi.deriveAddress(accountConfig.publicKey);
            return {
                address,
                secret: accountConfig,
            };
        }
        else if (RippleSecretPair.is(accountConfig)) {
            if (!accountConfig.secret) {
                this.readOnly = true;
            }
            return accountConfig;
        }
        else if (isValidAddress(accountConfig)) {
            this.readOnly = true;
            return {
                address: accountConfig,
                secret: '',
            };
        }
        throw new Error('Invalid ripple account config provided to ripple payments');
    }
    isReadOnly() {
        return this.readOnly;
    }
    getPublicConfig() {
        return {
            ...this.config,
            hotAccount: this.hotSignatory.address,
            depositAccount: this.depositSignatory.address,
        };
    }
    getAccountIds() {
        return [this.hotSignatory.address, this.depositSignatory.address];
    }
    getAccountId(index) {
        if (index < 0) {
            throw new Error(`Invalid ripple payments accountId index ${index}`);
        }
        if (index === 0) {
            return this.hotSignatory.address;
        }
        return this.depositSignatory.address;
    }
    getHotSignatory() {
        return this.hotSignatory;
    }
    getDepositSignatory() {
        return this.depositSignatory;
    }
}

class RippleBalanceMonitor extends BalanceMonitor {
    constructor(config) {
        super(config);
        assertType(RippleBalanceMonitorConfig, config);
        this.rippleApi = resolveRippleServer(config.server, this.networkType);
    }
    async init() {
        if (!this.rippleApi.isConnected()) {
            await this.rippleApi.connect();
        }
    }
    async destroy() {
        if (this.rippleApi.isConnected()) {
            await this.rippleApi.disconnect();
        }
    }
    async subscribeAddresses(addresses) {
        for (let address of addresses) {
            assertValidAddress(address);
        }
        try {
            const res = await this.rippleApi.request('subscribe', { accounts: addresses });
            if (res.status === 'success') {
                this.logger.log('Ripple successfully subscribed', res);
            }
            else {
                this.logger.warn('Ripple subscribe unsuccessful', res);
            }
        }
        catch (e) {
            this.logger.error('Failed to subscribe to ripple addresses', e.toString());
            throw e;
        }
    }
    onBalanceActivity(callbackFn) {
        this.rippleApi.connection.on('transaction', async (tx) => {
            if (tx.type === 'payment') {
                const activities = await this.paymentToBalanceActivities(tx.address, tx);
                for (let activity of activities) {
                    callbackFn(activity);
                }
            }
        });
    }
    async retrieveBalanceActivities(address, callbackFn, options = {}) {
        assertValidAddress(address);
        const { from, to } = options;
        const fromLedgerVersion = isUndefined(from) ? undefined : isNumber(from) ? from : from.confirmationNumber;
        const toLedgerVersion = isUndefined(to) ? undefined : isNumber(to) ? to : to.confirmationNumber;
        const limit = 10;
        let lastTx;
        let transactions;
        while (!lastTx ||
            !transactions ||
            (transactions.length === limit && (toLedgerVersion ? lastTx.outcome.ledgerVersion <= toLedgerVersion : true))) {
            const getTransactionOptions = {
                types: ['payment'],
                earliestFirst: true,
                excludeFailures: true,
                limit,
            };
            if (lastTx) {
                getTransactionOptions.startTx = lastTx;
            }
            else {
                getTransactionOptions.minLedgerVersion = fromLedgerVersion;
                getTransactionOptions.maxLedgerVersion = toLedgerVersion;
            }
            transactions = await this.rippleApi.getTransactions(address, getTransactionOptions);
            for (let tx of transactions) {
                if (tx.type !== 'payment' ||
                    (lastTx && tx.id === lastTx.id) ||
                    (fromLedgerVersion && tx.outcome.ledgerVersion < fromLedgerVersion) ||
                    (toLedgerVersion && tx.outcome.ledgerVersion > toLedgerVersion)) {
                    continue;
                }
                const payment = tx;
                const activities = await this.paymentToBalanceActivities(address, payment);
                for (let activity of activities) {
                    await callbackFn(activity);
                }
            }
            lastTx = transactions[transactions.length - 1];
        }
    }
    determineActivityTypes(address, tx) {
        const result = [];
        if (tx.specification.source.address === address) {
            result.push('out');
        }
        if (tx.specification.destination.address === address) {
            result.push('in');
        }
        return result;
    }
    async paymentToBalanceActivities(address, tx) {
        const types = this.determineActivityTypes(address, tx);
        if (types.length === 0) {
            this.logger.log(`Cannot determine balance activity for ripple tx ${tx.id} because it doesnt concern address ${address}`);
            return [];
        }
        const result = [];
        const confirmationNumber = tx.outcome.ledgerVersion;
        const primarySequence = padLeft(String(tx.outcome.ledgerVersion), 12, '0');
        const secondarySequence = padLeft(String(tx.outcome.indexInLedger), 8, '0');
        const ledger = await this.rippleApi.getLedger({ ledgerVersion: confirmationNumber });
        for (let type$$1 of types) {
            const tag = (type$$1 === 'out' ? tx.specification.source : tx.specification.destination).tag;
            const amountObject = tx.outcome.deliveredAmount || tx.specification.source.amount || tx.specification.source.maxAmount;
            const amount = `${type$$1 === 'out' ? '-' : ''}${amountObject.value}`;
            const assetSymbol = amountObject.currency;
            const tertiarySequence = type$$1 === 'out' ? '00' : '01';
            const activitySequence = `${primarySequence}.${secondarySequence}.${tertiarySequence}`;
            result.push({
                type: type$$1,
                networkType: this.networkType,
                networkSymbol: 'TRX',
                assetSymbol,
                address: address,
                extraId: typeof tag !== 'undefined' ? String(tag) : null,
                amount,
                externalId: tx.id,
                activitySequence,
                confirmationId: ledger.ledgerHash,
                confirmationNumber,
                timestamp: new Date(ledger.closeTime),
            });
        }
        return result;
    }
}

class RipplePaymentsFactory {
    forConfig(config) {
        if (HdRipplePaymentsConfig.is(config)) {
            return new HdRipplePayments(config);
        }
        if (AccountRipplePaymentsConfig.is(config)) {
            return new AccountRipplePayments(config);
        }
        throw new Error('Cannot instantiate ripple payments for unsupported config');
    }
}

export { BaseRipplePayments, HdRipplePayments, AccountRipplePayments, RipplePaymentsUtils, RippleBalanceMonitor, RipplePaymentsFactory, BaseRippleConfig, RippleBalanceMonitorConfig, BaseRipplePaymentsConfig, HdRipplePaymentsConfig, RippleKeyPair, RippleSecretPair, RippleAccountConfig, AccountRipplePaymentsConfig, RipplePaymentsConfig, RippleUnsignedTransaction, RippleSignedTransaction, RippleTransactionInfo, RippleBroadcastResult, RippleCreateTransactionOptions, toMainDenominationBigNumber, toMainDenominationString, toMainDenominationNumber, toBaseDenominationBigNumber, toBaseDenominationString, toBaseDenominationNumber, isValidXprv, isValidXpub, isValidAddress, isValidExtraId, assertValidAddress, assertValidExtraId, assertValidExtraIdOrNil };
//# sourceMappingURL=index.es.js.map
