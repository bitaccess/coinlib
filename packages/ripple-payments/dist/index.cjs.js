'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var lodash = require('lodash');
var t = require('io-ts');
var rippleLib = require('ripple-lib');
var util = require('util');
var paymentsCommon = require('@faast/payments-common');
var promiseRetry = _interopDefault(require('promise-retry'));
var bip32 = require('bip32');
var baseX = _interopDefault(require('base-x'));
var crypto = _interopDefault(require('crypto'));
var BigNumber = _interopDefault(require('bignumber.js'));
var tsCommon = require('@faast/ts-common');

const BaseRippleConfig = tsCommon.extendCodec(paymentsCommon.BaseConfig, {}, {
    server: t.union([t.string, tsCommon.instanceofCodec(rippleLib.RippleAPI), t.nullType]),
}, 'BaseRippleConfig');
const RippleBalanceMonitorConfig = BaseRippleConfig;
const BaseRipplePaymentsConfig = tsCommon.extendCodec(BaseRippleConfig, {}, {
    maxLedgerVersionOffset: t.number,
}, 'BaseRipplePaymentsConfig');
const HdRipplePaymentsConfig = tsCommon.extendCodec(BaseRipplePaymentsConfig, {
    hdKey: t.string,
}, 'HdRipplePaymentsConfig');
const RippleKeyPair = t.type({
    publicKey: t.string,
    privateKey: t.string,
}, 'RippleKeyPair');
const RippleSecretPair = t.type({
    address: t.string,
    secret: t.string,
}, 'RippleSecretPair');
const RippleAccountConfig = t.union([t.string, RippleSecretPair, RippleKeyPair], 'RippleAccountConfig');
const AccountRipplePaymentsConfig = tsCommon.extendCodec(BaseRipplePaymentsConfig, {
    hotAccount: RippleAccountConfig,
    depositAccount: RippleAccountConfig,
}, 'AccountRipplePaymentsConfig');
const RipplePaymentsConfig = t.union([HdRipplePaymentsConfig, AccountRipplePaymentsConfig], 'RipplePaymentsConfig');
const RippleUnsignedTransaction = tsCommon.extendCodec(paymentsCommon.BaseUnsignedTransaction, {
    amount: t.string,
    fee: t.string,
}, 'RippleUnsignedTransaction');
const RippleSignedTransaction = tsCommon.extendCodec(paymentsCommon.BaseSignedTransaction, {
    id: t.string,
}, 'RippleSignedTransaction');
const RippleTransactionInfo = tsCommon.extendCodec(paymentsCommon.BaseTransactionInfo, {
    confirmationNumber: tsCommon.nullable(t.string),
}, {}, 'RippleTransactionInfo');
const RippleBroadcastResult = tsCommon.extendCodec(paymentsCommon.BaseBroadcastResult, {
    rebroadcast: t.boolean,
    data: t.object,
}, 'RippleBroadcastResult');
const RippleCreateTransactionOptions = tsCommon.extendCodec(paymentsCommon.CreateTransactionOptions, {}, {
    maxLedgerVersionOffset: t.number,
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
const DEFAULT_NETWORK = paymentsCommon.NetworkType.Mainnet;
const DEFAULT_MAINNET_SERVER = 'wss://s1.ripple.com';
const DEFAULT_TESTNET_SERVER = 'wss://s.altnet.rippletest.net:51233';

const { toMainDenominationBigNumber, toMainDenominationString, toMainDenominationNumber, toBaseDenominationBigNumber, toBaseDenominationString, toBaseDenominationNumber, } = paymentsCommon.createUnitConverters(DECIMAL_PLACES);
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
    if (!tsCommon.isNil(extraId) && !isValidExtraId(extraId)) {
        throw new Error(`Invalid ripple extraId: ${extraId}`);
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
        server = network === paymentsCommon.NetworkType.Testnet ? DEFAULT_TESTNET_SERVER : DEFAULT_MAINNET_SERVER;
    }
    if (util.isString(server)) {
        return {
            api: new rippleLib.RippleAPI({
                server,
            }),
            server,
        };
    }
    else if (server instanceof rippleLib.RippleAPI) {
        return {
            api: server,
            server: server.connection._url || '',
        };
    }
    else {
        return {
            api: new rippleLib.RippleAPI(),
            server: null,
        };
    }
}
const CONNECTION_ERRORS = ['ConnectionError', 'NotConnectedError', 'DisconnectedError'];
const RETRYABLE_ERRORS = [...CONNECTION_ERRORS, 'TimeoutError'];
const MAX_RETRIES = 3;
function retryIfDisconnected(fn, rippleApi, logger) {
    return promiseRetry((retry, attempt) => {
        return fn().catch(async (e) => {
            const eName = e ? e.constructor.name : '';
            if (RETRYABLE_ERRORS.includes(eName)) {
                if (CONNECTION_ERRORS.includes(eName)) {
                    logger.log('Connection error during rippleApi call, attempting to reconnect then ' +
                        `retrying ${MAX_RETRIES - attempt} more times`, e.toString());
                    if (rippleApi.isConnected()) {
                        await rippleApi.disconnect();
                    }
                    await rippleApi.connect();
                }
                else {
                    logger.log(`Retryable error during rippleApi call, retrying ${MAX_RETRIES - attempt} more times`, e.toString());
                }
                retry(e);
            }
            throw e;
        });
    }, {
        retries: MAX_RETRIES,
    });
}

class RippleConnected {
    constructor(config = {}) {
        tsCommon.assertType(BaseRippleConfig, config);
        this.networkType = config.network || DEFAULT_NETWORK;
        this.logger = new tsCommon.DelegateLogger(config.logger, PACKAGE_NAME);
        const { api, server } = resolveRippleServer(config.server, this.networkType);
        this.api = api;
        this.server = server;
    }
    async init() {
        if (!this.api.isConnected()) {
            await this.api.connect();
        }
    }
    async destroy() {
        if (this.api.isConnected()) {
            await this.api.disconnect();
        }
    }
    async _retryDced(fn) {
        return retryIfDisconnected(fn, this.api, this.logger);
    }
}

class RipplePaymentsUtils extends RippleConnected {
    constructor(config) {
        super(config);
        this.isValidXprv = isValidXprv;
        this.isValidXpub = isValidXpub;
    }
    async isValidExtraId(extraId) {
        return isValidExtraId(extraId);
    }
    async isValidAddress(address) {
        return isValidAddress(address);
    }
    async _getPayportValidationMessage(payport) {
        const { address, extraId } = payport;
        if (!(await this.isValidAddress(address))) {
            return 'Invalid payport address';
        }
        let requireExtraId = false;
        try {
            const settings = await this._retryDced(() => this.api.getSettings(address));
            requireExtraId = settings.requireDestinationTag || false;
        }
        catch (e) {
            this.logger.log(`getPayportValidationMessage failed to retrieve settings for ${address} - ${e.message}`);
        }
        if (tsCommon.isNil(extraId)) {
            if (requireExtraId) {
                return `Payport extraId is required for address ${address} with ripple requireDestinationTag setting enabled`;
            }
        }
        else if (!(await this.isValidExtraId(extraId))) {
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
        if (!paymentsCommon.Payport.is(payport)) {
            return false;
        }
        return !(await this._getPayportValidationMessage(payport));
    }
    toMainDenomination(amount) {
        return toMainDenominationString(amount);
    }
    toBaseDenomination(amount) {
        return toBaseDenominationString(amount);
    }
}

function extraIdToTag(extraId) {
    return tsCommon.isNil(extraId) ? undefined : Number.parseInt(extraId);
}
function serializePayport(payport) {
    return tsCommon.isNil(payport.extraId) ? payport.address : `${payport.address}/${payport.extraId}`;
}
class BaseRipplePayments extends RipplePaymentsUtils {
    constructor(config) {
        super(config);
        this.config = config;
    }
    getFullConfig() {
        return this.config;
    }
    getPublicConfig() {
        return {
            ...lodash.omit(this.config, ['logger', 'server']),
            ...this.getPublicAccountConfig(),
        };
    }
    doGetPayport(index) {
        if (index === 0) {
            return { address: this.getHotSignatory().address };
        }
        if (index === 1) {
            return { address: this.getDepositSignatory().address };
        }
        return { address: this.getDepositSignatory().address, extraId: String(index) };
    }
    doResolvePayport(payport) {
        if (typeof payport === 'number') {
            return this.doGetPayport(payport);
        }
        else if (typeof payport === 'string') {
            assertValidAddress(payport);
            return { address: payport };
        }
        assertValidAddress(payport.address);
        assertValidExtraIdOrNil(payport.extraId);
        return payport;
    }
    async resolvePayport(payport) {
        return this.doResolvePayport(payport);
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
        return this.doGetPayport(index);
    }
    requiresBalanceMonitor() {
        return true;
    }
    getAddressesToMonitor() {
        return [this.getHotSignatory().address, this.getDepositSignatory().address];
    }
    isSweepableAddressBalance(balance) {
        return new BigNumber(balance).gt(0);
    }
    isSweepableBalance(balance, payport) {
        const balanceBase = toBaseDenominationBigNumber(balance);
        if (payport) {
            payport = this.doResolvePayport(payport);
            if (tsCommon.isNil(payport.extraId)) {
                return this.isSweepableAddressBalance(balanceBase);
            }
        }
        return balanceBase.gt(0);
    }
    async initAccounts() {
        const { address, secret } = this.getDepositSignatory();
        const settings = await this.api.getSettings(address);
        if (settings.requireDestinationTag) {
            return;
        }
        if (this.isReadOnly()) {
            this.logger.warn(`Deposit account (${address}) doesn't have requireDestinationTag property set`);
            return;
        }
        const { confirmedBalance } = await this.getBalance(address);
        const { feeMain } = await this.resolveFeeOption({ feeLevel: paymentsCommon.FeeLevel.Medium });
        if (new BigNumber(confirmedBalance).lt(feeMain)) {
            this.logger.warn(`Insufficient balance in deposit account (${address}) to pay fee of ${feeMain} XRP ` +
                'to send a transaction that sets requireDestinationTag property to true');
        }
        const unsignedTx = await this._retryDced(() => this.api.prepareSettings(address, {
            requireDestinationTag: true,
        }));
        const signedTx = this.api.sign(unsignedTx.txJSON, secret);
        const broadcast = await this._retryDced(() => this.api.submit(signedTx.signedTransaction));
        return {
            txId: signedTx.id,
            unsignedTx,
            signedTx,
            broadcast,
        };
    }
    async getBalance(payportOrIndex) {
        const payport = await this.resolvePayport(payportOrIndex);
        const { address, extraId } = payport;
        if (!tsCommon.isNil(extraId)) {
            throw new Error(`Cannot getBalance of ripple payport with extraId ${extraId}, use BalanceMonitor instead`);
        }
        const balances = await this._retryDced(() => this.api.getBalances(address));
        this.logger.debug(`rippleApi.getBalance ${address}`, balances);
        const xrpBalance = balances.find(({ currency }) => currency === 'XRP');
        const xrpAmount = xrpBalance && xrpBalance.value ? xrpBalance.value : '0';
        const confirmedBalance = new BigNumber(xrpAmount).minus(MIN_BALANCE);
        return {
            confirmedBalance: confirmedBalance.toString(),
            unconfirmedBalance: '0',
            sweepable: this.isSweepableAddressBalance(xrpAmount),
        };
    }
    async getNextSequenceNumber(payportOrIndex) {
        const payport = await this.resolvePayport(payportOrIndex);
        const { address } = payport;
        const accountInfo = await this._retryDced(() => this.api.getAccountInfo(address));
        return new BigNumber(accountInfo.sequence).toString();
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
            tx = await this._retryDced(() => this.api.getTransaction(txId));
        }
        catch (e) {
            const eString = e.toString();
            if (NOT_FOUND_ERRORS.some(type => eString.includes(type))) {
                throw new Error(`Transaction not found: ${eString}`);
            }
            throw e;
        }
        this.logger.debug('getTransaction', txId, tx);
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
        const isSuccessful = outcome.result.startsWith('tes');
        const isCostDestroyed = outcome.result.startsWith('tec');
        const status = isSuccessful || isCostDestroyed ? paymentsCommon.TransactionStatus.Confirmed : paymentsCommon.TransactionStatus.Failed;
        const isExecuted = isSuccessful;
        const confirmationNumber = outcome.ledgerVersion;
        const ledger = await this._retryDced(() => this.api.getLedger({ ledgerVersion: confirmationNumber }));
        const currentLedgerVersion = await this._retryDced(() => this.api.getLedgerVersion());
        const confirmationId = ledger.ledgerHash;
        const confirmationTimestamp = outcome.timestamp ? new Date(outcome.timestamp) : null;
        return {
            status,
            id: tx.id,
            fromIndex,
            fromAddress: source.address,
            fromExtraId: typeof source.tag !== 'undefined' ? String(source.tag) : null,
            toIndex,
            toAddress: destination.address,
            toExtraId: typeof destination.tag !== 'undefined' ? String(destination.tag) : null,
            amount: amount,
            fee: outcome.fee,
            sequenceNumber: String(tx.sequence),
            confirmationId,
            confirmationNumber: String(confirmationNumber),
            confirmationTimestamp,
            isExecuted,
            isConfirmed: Boolean(confirmationNumber),
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
        if (feeOption.feeLevel === paymentsCommon.FeeLevel.Custom) {
            targetFeeLevel = feeOption.feeLevel;
            targetFeeRate = feeOption.feeRate;
            targetFeeRateType = feeOption.feeRateType;
            if (targetFeeRateType === paymentsCommon.FeeRateType.Base) {
                feeBase = targetFeeRate;
                feeMain = this.toMainDenomination(feeBase);
            }
            else if (targetFeeRateType === paymentsCommon.FeeRateType.Main) {
                feeMain = targetFeeRate;
                feeBase = this.toBaseDenomination(feeMain);
            }
            else {
                throw new Error(`Unsupport ripple feeRateType ${feeOption.feeRateType}`);
            }
        }
        else {
            targetFeeLevel = feeOption.feeLevel || paymentsCommon.FeeLevel.Medium;
            let cushion;
            if (targetFeeLevel === paymentsCommon.FeeLevel.Low) {
                cushion = 1;
            }
            else if (targetFeeLevel === paymentsCommon.FeeLevel.Medium) {
                cushion = 1.2;
            }
            else if (targetFeeLevel === paymentsCommon.FeeLevel.High) {
                cushion = 1.5;
            }
            feeMain = await this._retryDced(() => this.api.getFee(cushion));
            feeBase = this.toBaseDenomination(feeMain);
            targetFeeRate = feeMain;
            targetFeeRateType = paymentsCommon.FeeRateType.Main;
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
        if (tsCommon.isNil(fromPayport.extraId)) {
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
        const { fromIndex, fromAddress, fromExtraId, fromPayport, toIndex, toAddress, toExtraId } = fromTo;
        if (fromAddress === toAddress) {
            throw new Error('Cannot create XRP payment transaction sending XRP to self');
        }
        const { targetFeeLevel, targetFeeRate, targetFeeRateType, feeMain } = feeOption;
        const { sequenceNumber } = options;
        const maxLedgerVersionOffset = options.maxLedgerVersionOffset || this.config.maxLedgerVersionOffset || DEFAULT_MAX_LEDGER_VERSION_OFFSET;
        const amountString = amount.toString();
        const addressBalances = await this.getBalance({ address: fromAddress });
        const addressBalance = new BigNumber(addressBalances.confirmedBalance);
        const actualBalance = addressBalance.plus(MIN_BALANCE);
        if (addressBalance.lt(0)) {
            throw new Error(`Cannot send from ripple address that has less than ${MIN_BALANCE} XRP: ${fromAddress} (${actualBalance} XRP)`);
        }
        const totalValue = amount.plus(feeMain);
        if (addressBalance.minus(totalValue).lt(0)) {
            throw new Error(`Cannot send ${amountString} XRP with fee of ${feeMain} XRP because it would reduce the balance below ` +
                `the minimum required balance of ${MIN_BALANCE} XRP: ${fromAddress} (${actualBalance} XRP)`);
        }
        if (typeof fromExtraId === 'string' && totalValue.gt(payportBalance)) {
            throw new Error(`Insufficient payport balance of ${payportBalance} XRP to send ${amountString} XRP ` +
                `with fee of ${feeMain} XRP: ${serializePayport(fromPayport)}`);
        }
        const preparedTx = await this._retryDced(() => this.api.preparePayment(fromAddress, {
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
            sequence: tsCommon.isUndefined(sequenceNumber) ? sequenceNumber : new BigNumber(sequenceNumber).toNumber(),
        }));
        return {
            status: paymentsCommon.TransactionStatus.Unsigned,
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
            sequenceNumber: String(preparedTx.instructions.sequence),
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
        return this.doCreateTransaction(fromTo, feeOption, amountBn, payportBalance, options);
    }
    async signTransaction(unsignedTx) {
        tsCommon.assertType(RippleUnsignedTransaction, unsignedTx);
        if (this.isReadOnly()) {
            throw new Error('Cannot sign transaction with read only ripple payments (no xprv or secrets provided)');
        }
        this.logger.debug('signTransaction', unsignedTx.data);
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
        const signResult = this.api.sign(txJSON, secret);
        return {
            ...unsignedTx,
            id: signResult.id,
            data: signResult,
            status: paymentsCommon.TransactionStatus.Signed,
        };
    }
    async broadcastTransaction(signedTx) {
        tsCommon.assertType(RippleSignedTransaction, signedTx);
        const signedTxString = signedTx.data.signedTransaction;
        let rebroadcast = false;
        try {
            const existing = await this.getTransactionInfo(signedTx.id);
            rebroadcast = existing.id === signedTx.id;
        }
        catch (e) { }
        const result = (await this._retryDced(() => this.api.submit(signedTxString)));
        this.logger.debug('broadcasted', result);
        const resultCode = result.engine_result || result.resultCode || '';
        if (resultCode === 'terPRE_SEQ') {
            throw new paymentsCommon.PaymentsError(paymentsCommon.PaymentsErrorCode.TxSequenceTooHigh, resultCode);
        }
        if (!rebroadcast) {
            if (resultCode === 'tefPAST_SEQ') {
                throw new paymentsCommon.PaymentsError(paymentsCommon.PaymentsErrorCode.TxSequenceCollision, resultCode);
            }
            if (resultCode === 'tefMAX_LEDGER') {
                throw new paymentsCommon.PaymentsError(paymentsCommon.PaymentsErrorCode.TxExpired, resultCode);
            }
        }
        const okay = resultCode.startsWith('tes') ||
            resultCode.startsWith('ter') ||
            resultCode.startsWith('tec') ||
            resultCode === 'tefPAST_SEQ' ||
            resultCode === 'tefMAX_LEDGER';
        if (!okay) {
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
    const key = bip32.fromBase58(hdKey);
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
    const key = typeof xprv === 'string' ? bip32.fromBase58(xprv) : xprv;
    const derivedPubKey = deriveBasePath(key);
    return derivedPubKey.neutered().toBase58();
}
function generateNewKeys() {
    const key = bip32.fromSeed(crypto.randomBytes(32));
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
    getPublicAccountConfig() {
        return {
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
        tsCommon.assertType(AccountRipplePaymentsConfig, config);
        this.hotSignatory = this.accountConfigToSignatory(config.hotAccount);
        this.depositSignatory = this.accountConfigToSignatory(config.depositAccount);
    }
    accountConfigToSignatory(accountConfig) {
        if (RippleKeyPair.is(accountConfig)) {
            if (!accountConfig.privateKey) {
                this.readOnly = true;
            }
            const address = this.api.deriveAddress(accountConfig.publicKey);
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
    getPublicAccountConfig() {
        return {
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

class RippleBalanceMonitor extends RippleConnected {
    constructor(config) {
        super(config);
        this.config = config;
    }
    async subscribeAddresses(addresses) {
        for (let address of addresses) {
            assertValidAddress(address);
        }
        try {
            const res = await this._retryDced(() => this.api.request('subscribe', { accounts: addresses }));
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
        this.api.connection.on('transaction', async (tx) => {
            const activity = await this.txToBalanceActivity(tx.address, tx);
            if (activity) {
                callbackFn(activity);
            }
        });
    }
    async resolveFromToLedgers(options) {
        const serverInfo = await this._retryDced(() => this.api.getServerInfo());
        const completeLedgers = serverInfo.completeLedgers.split('-');
        let fromLedgerVersion = new BigNumber(completeLedgers[0]);
        let toLedgerVersion = new BigNumber(completeLedgers[1]);
        const { from, to } = options;
        const requestedFrom = tsCommon.isUndefined(from)
            ? undefined
            : new BigNumber(tsCommon.Numeric.is(from) ? from : from.confirmationNumber);
        const requestedTo = tsCommon.isUndefined(to) ? undefined : new BigNumber(tsCommon.Numeric.is(to) ? to : to.confirmationNumber);
        if (!tsCommon.isUndefined(requestedFrom)) {
            if (requestedFrom.lt(fromLedgerVersion)) {
                this.logger.warn(`Server balance activity doesn't go back to ledger ${requestedFrom}, using ${fromLedgerVersion} instead`);
            }
            else {
                fromLedgerVersion = requestedFrom;
            }
        }
        if (!tsCommon.isUndefined(requestedTo)) {
            if (requestedTo > toLedgerVersion) {
                this.logger.warn(`Server balance activity doesn't go up to ledger ${requestedTo}, using ${toLedgerVersion} instead`);
            }
            else {
                toLedgerVersion = requestedTo;
            }
        }
        return {
            from: fromLedgerVersion,
            to: toLedgerVersion,
        };
    }
    async retrieveBalanceActivities(address, callbackFn, options = {}) {
        assertValidAddress(address);
        const { from, to } = await this.resolveFromToLedgers(options);
        const limit = 10;
        let lastTx;
        let transactions;
        while (tsCommon.isUndefined(transactions) ||
            (transactions.length === limit && lastTx && to.gt(lastTx.outcome.ledgerVersion))) {
            const getTransactionOptions = {
                earliestFirst: true,
                excludeFailures: false,
                limit,
            };
            if (lastTx) {
                getTransactionOptions.start = lastTx.id;
            }
            else {
                getTransactionOptions.minLedgerVersion = from.toNumber();
                getTransactionOptions.maxLedgerVersion = to.toNumber();
            }
            transactions = await this._retryDced(() => this.api.getTransactions(address, getTransactionOptions));
            this.logger.debug(`retrieved ripple txs for ${address}`, transactions);
            for (let tx of transactions) {
                if ((lastTx && tx.id === lastTx.id) || from.gte(tx.outcome.ledgerVersion) || to.lte(tx.outcome.ledgerVersion)) {
                    continue;
                }
                const activity = await this.txToBalanceActivity(address, tx);
                if (activity) {
                    await callbackFn(activity);
                }
            }
            lastTx = transactions[transactions.length - 1];
        }
        return { from: from.toString(), to: to.toString() };
    }
    isPaymentTx(tx) {
        return tx.type === 'payment';
    }
    async txToBalanceActivity(address, tx) {
        if (!tx.outcome) {
            this.logger.warn('txToBalanceActivity received tx object without outcome!', tx);
            return null;
        }
        const txResult = tx.outcome.result;
        if (!tsCommon.isString(txResult) || !(txResult.startsWith('tes') || txResult.startsWith('tec'))) {
            this.logger.log(`No balance activity for ripple tx ${tx.id} because status is ${txResult}`);
            return null;
        }
        const confirmationNumber = tx.outcome.ledgerVersion;
        const primarySequence = padLeft(String(tx.outcome.ledgerVersion), 12, '0');
        const secondarySequence = padLeft(String(tx.outcome.indexInLedger), 8, '0');
        const ledger = await this._retryDced(() => this.api.getLedger({ ledgerVersion: confirmationNumber }));
        const balanceChange = (tx.outcome.balanceChanges[address] || []).find(({ currency }) => currency === 'XRP');
        if (!balanceChange) {
            this.logger.log(`Cannot determine balanceChange for address ${address} in ripple tx ${tx.id} because there's no XRP entry`);
            return null;
        }
        const amount = balanceChange.value;
        const assetSymbol = balanceChange.currency;
        const type = amount.startsWith('-') ? 'out' : 'in';
        const tag = this.isPaymentTx(tx)
            ? (type === 'out' ? tx.specification.source : tx.specification.destination).tag
            : undefined;
        const tertiarySequence = type === 'out' ? '00' : '01';
        const activitySequence = `${primarySequence}.${secondarySequence}.${tertiarySequence}`;
        return {
            type,
            networkType: this.networkType,
            networkSymbol: 'XRP',
            assetSymbol,
            address: address,
            extraId: !tsCommon.isUndefined(tag) ? String(tag) : null,
            amount,
            externalId: tx.id,
            activitySequence,
            confirmationId: ledger.ledgerHash,
            confirmationNumber: String(confirmationNumber),
            timestamp: new Date(ledger.closeTime),
        };
    }
}

class RipplePaymentsFactory {
    forConfig(config) {
        if (AccountRipplePaymentsConfig.is(config)) {
            return new AccountRipplePayments(config);
        }
        return new HdRipplePayments(tsCommon.assertType(HdRipplePaymentsConfig, config));
    }
}

exports.CreateTransactionOptions = paymentsCommon.CreateTransactionOptions;
exports.BaseRipplePayments = BaseRipplePayments;
exports.HdRipplePayments = HdRipplePayments;
exports.AccountRipplePayments = AccountRipplePayments;
exports.RipplePaymentsUtils = RipplePaymentsUtils;
exports.RippleBalanceMonitor = RippleBalanceMonitor;
exports.RipplePaymentsFactory = RipplePaymentsFactory;
exports.BaseRippleConfig = BaseRippleConfig;
exports.RippleBalanceMonitorConfig = RippleBalanceMonitorConfig;
exports.BaseRipplePaymentsConfig = BaseRipplePaymentsConfig;
exports.HdRipplePaymentsConfig = HdRipplePaymentsConfig;
exports.RippleKeyPair = RippleKeyPair;
exports.RippleSecretPair = RippleSecretPair;
exports.RippleAccountConfig = RippleAccountConfig;
exports.AccountRipplePaymentsConfig = AccountRipplePaymentsConfig;
exports.RipplePaymentsConfig = RipplePaymentsConfig;
exports.RippleUnsignedTransaction = RippleUnsignedTransaction;
exports.RippleSignedTransaction = RippleSignedTransaction;
exports.RippleTransactionInfo = RippleTransactionInfo;
exports.RippleBroadcastResult = RippleBroadcastResult;
exports.RippleCreateTransactionOptions = RippleCreateTransactionOptions;
exports.toMainDenominationBigNumber = toMainDenominationBigNumber;
exports.toMainDenominationString = toMainDenominationString;
exports.toMainDenominationNumber = toMainDenominationNumber;
exports.toBaseDenominationBigNumber = toBaseDenominationBigNumber;
exports.toBaseDenominationString = toBaseDenominationString;
exports.toBaseDenominationNumber = toBaseDenominationNumber;
exports.isValidXprv = isValidXprv;
exports.isValidXpub = isValidXpub;
exports.isValidAddress = isValidAddress;
exports.isValidExtraId = isValidExtraId;
exports.assertValidAddress = assertValidAddress;
exports.assertValidExtraId = assertValidExtraId;
exports.assertValidExtraIdOrNil = assertValidExtraIdOrNil;
//# sourceMappingURL=index.cjs.js.map
