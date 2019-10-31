'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var t = require('io-ts');
var paymentsCommon = require('@faast/payments-common');
var promiseRetry = _interopDefault(require('promise-retry'));
var lodash = require('lodash');
var StellarHDWallet = _interopDefault(require('stellar-hd-wallet'));
require('bip39');
var Stellar = require('stellar-sdk');
var util = require('util');
var events = require('events');
var BigNumber = _interopDefault(require('bignumber.js'));
var tsCommon = require('@faast/ts-common');

const BaseStellarConfig = tsCommon.extendCodec(paymentsCommon.BaseConfig, {}, {
    server: t.union([t.string, tsCommon.instanceofCodec(Stellar.Server), t.nullType]),
}, 'BaseStellarConfig');
const StellarBalanceMonitorConfig = BaseStellarConfig;
const BaseStellarPaymentsConfig = tsCommon.extendCodec(BaseStellarConfig, {}, {
    txTimeoutSeconds: t.number,
}, 'BaseStellarPaymentsConfig');
const HdStellarPaymentsConfig = tsCommon.extendCodec(BaseStellarPaymentsConfig, {
    seed: t.string,
}, 'HdStellarPaymentsConfig');
const StellarSignatory = t.type({
    address: t.string,
    secret: t.string,
}, 'StellarSignatory');
const PartialStellarSignatory = t.partial(StellarSignatory.props, 'PartialStellarSignatory');
const StellarAccountConfig = t.union([
    t.string, PartialStellarSignatory,
], 'StellarAccountConfig');
const AccountStellarPaymentsConfig = tsCommon.extendCodec(BaseStellarPaymentsConfig, {
    hotAccount: StellarAccountConfig,
    depositAccount: StellarAccountConfig,
}, 'AccountStellarPaymentsConfig');
const StellarPaymentsConfig = t.union([HdStellarPaymentsConfig, AccountStellarPaymentsConfig], 'StellarPaymentsConfig');
const StellarUnsignedTransaction = tsCommon.extendCodec(paymentsCommon.BaseUnsignedTransaction, {
    amount: t.string,
    fee: t.string,
}, 'StellarUnsignedTransaction');
const StellarSignedTransaction = tsCommon.extendCodec(paymentsCommon.BaseSignedTransaction, {}, 'StellarSignedTransaction');
const StellarTransactionInfo = tsCommon.extendCodec(paymentsCommon.BaseTransactionInfo, {
    confirmationNumber: tsCommon.nullable(t.string),
}, {}, 'StellarTransactionInfo');
const StellarBroadcastResult = tsCommon.extendCodec(paymentsCommon.BaseBroadcastResult, {
    rebroadcast: t.boolean,
    data: t.object,
}, 'StellarBroadcastResult');
const StellarCreateTransactionOptions = tsCommon.extendCodec(paymentsCommon.CreateTransactionOptions, {}, {
    timeoutSeconds: t.number,
}, 'StellarCreateTransactionOptions');

const PACKAGE_NAME = 'stellar-payments';
const DECIMAL_PLACES = 7;
const MIN_BALANCE = 1;
const DEFAULT_CREATE_TRANSACTION_OPTIONS = {};
const DEFAULT_TX_TIMEOUT_SECONDS = 5 * 60;
const NOT_FOUND_ERRORS = ['MissingLedgerHistoryError', 'NotFoundError'];
const DEFAULT_NETWORK = paymentsCommon.NetworkType.Mainnet;
const DEFAULT_MAINNET_SERVER = 'https://horizon.stellar.org';
const DEFAULT_TESTNET_SERVER = 'https://horizon-testnet.stellar.org';

const { toMainDenominationBigNumber, toMainDenominationString, toMainDenominationNumber, toBaseDenominationBigNumber, toBaseDenominationString, toBaseDenominationNumber, } = paymentsCommon.createUnitConverters(DECIMAL_PLACES);
function isValidAddress(address) {
    return util.isString(address) && Stellar.StrKey.isValidEd25519PublicKey(address);
}
function isValidExtraId(extraId) {
    return util.isString(extraId);
}
function isValidSecret(secret) {
    return util.isString(secret) && Stellar.StrKey.isValidEd25519SecretSeed(secret);
}
function assertValidAddress(address) {
    if (!isValidAddress(address)) {
        throw new Error(`Invalid stellar address: ${address}`);
    }
}
function assertValidExtraId(extraId) {
    if (!isValidExtraId(extraId)) {
        throw new Error(`Invalid stellar extraId: ${extraId}`);
    }
}
function assertValidExtraIdOrNil(extraId) {
    if (!tsCommon.isNil(extraId) && !isValidExtraId(extraId)) {
        throw new Error(`Invalid stellar extraId: ${extraId}`);
    }
}

function serializePayport(payport) {
    return tsCommon.isNil(payport.extraId) ? payport.address : `${payport.address}/${payport.extraId}`;
}
function omitHidden(o) {
    return lodash.omitBy(o, (_, k) => k.startsWith('_'));
}
function isStellarLedger(x) {
    return tsCommon.isObject(x) && x.hasOwnProperty('successful_transaction_count');
}
function isStellarTransaction(x) {
    return tsCommon.isObject(x) && x.hasOwnProperty('source_account');
}
function padLeft(x, n, v) {
    while (x.length < n) {
        x = `${v}${x}`;
    }
    return x;
}
function resolveStellarServer(server, network) {
    if (typeof server === 'undefined') {
        server = network === paymentsCommon.NetworkType.Testnet ? DEFAULT_TESTNET_SERVER : DEFAULT_MAINNET_SERVER;
    }
    if (tsCommon.isString(server)) {
        return {
            api: new Stellar.Server(server),
            server,
        };
    }
    else if (server instanceof Stellar.Server) {
        return {
            api: server,
            server: server.serverURL.toString(),
        };
    }
    else {
        return {
            api: null,
            server: null,
        };
    }
}
const CONNECTION_ERRORS = ['ConnectionError', 'NotConnectedError', 'DisconnectedError'];
const RETRYABLE_ERRORS = [...CONNECTION_ERRORS, 'TimeoutError'];
const MAX_RETRIES = 3;
function retryIfDisconnected(fn, stellarApi, logger) {
    return promiseRetry((retry, attempt) => {
        return fn().catch(async (e) => {
            const eName = e ? e.constructor.name : '';
            if (RETRYABLE_ERRORS.includes(eName)) {
                logger.log(`Retryable error during stellar server call, retrying ${MAX_RETRIES - attempt} more times`, e.toString());
                retry(e);
            }
            throw e;
        });
    }, {
        retries: MAX_RETRIES,
    });
}

class StellarConnected {
    constructor(config = {}) {
        tsCommon.assertType(BaseStellarConfig, config);
        this.networkType = config.network || DEFAULT_NETWORK;
        this.logger = new tsCommon.DelegateLogger(config.logger, PACKAGE_NAME);
        const { api, server } = resolveStellarServer(config.server, this.networkType);
        this.api = api;
        this.server = server;
    }
    getApi() {
        if (this.api === null) {
            throw new Error('Cannot access stellar network when configured with null server');
        }
        return this.api;
    }
    async init() { }
    async destroy() { }
    async _retryDced(fn) {
        return retryIfDisconnected(fn, this.getApi(), this.logger);
    }
    async getBlock(id) {
        let query = this.getApi()
            .ledgers()
            .order('desc')
            .limit(1);
        if (id) {
            query = query.ledger(id);
        }
        const ledgerCallResult = await this._retryDced(() => query.call());
        let ledger;
        if (ledgerCallResult.records) {
            ledger = ledgerCallResult.records[0];
        }
        else if (isStellarLedger(ledgerCallResult)) {
            ledger = ledgerCallResult;
        }
        else {
            this.logger.log(`getBlock(${id ? id : ''}) ledgerCallResult`, ledgerCallResult);
            throw new Error(`Cannot get stellar ledger ${id ? id : 'head'}`);
        }
        return ledger;
    }
    async _normalizeTxOperation(tx) {
        const opPage = await this._retryDced(() => tx.operations());
        const op = opPage.records.find(({ type }) => type === 'create_account' || type === 'payment');
        if (!op) {
            throw new Error(`Cannot normalize stellar tx - operation not found for transaction ${tx.id}`);
        }
        let fromAddress;
        let toAddress;
        let amount;
        if (op.type === 'create_account') {
            fromAddress = op.funder;
            toAddress = op.account;
            amount = op.starting_balance;
        }
        else if (op.type === 'payment') {
            if (op.asset_type !== 'native') {
                throw new Error(`Cannot normalize stellar tx - Unsupported stellar payment asset ${op.asset_type}`);
            }
            fromAddress = op.from;
            toAddress = op.to;
            amount = op.amount;
        }
        else {
            throw new Error(`Cannot normalize stellar tx - Unsupported stellar operation type ${op.type}`);
        }
        const fee = toMainDenominationBigNumber(tx.fee_paid);
        return { amount: new BigNumber(amount), fee, fromAddress, toAddress };
    }
}

class StellarPaymentsUtils extends StellarConnected {
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
        if (!tsCommon.isNil(extraId) && !(await this.isValidExtraId(extraId))) {
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
        tsCommon.assertType(paymentsCommon.Payport, payport, 'payport');
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

class BaseStellarPayments extends StellarPaymentsUtils {
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
    async getBalance(payportOrIndex) {
        const payport = await this.resolvePayport(payportOrIndex);
        const { address, extraId } = payport;
        if (!tsCommon.isNil(extraId)) {
            throw new Error(`Cannot getBalance of stellar payport with extraId ${extraId}, use BalanceMonitor instead`);
        }
        const accountInfo = await this._retryDced(() => this.getApi().loadAccount(address));
        this.logger.debug(`api.loadAccount ${address}`, omitHidden(accountInfo));
        const balanceLine = accountInfo.balances.find((line) => line.asset_type === 'native');
        const amountMain = new BigNumber(balanceLine && balanceLine.balance ? balanceLine.balance : '0');
        const confirmedBalance = amountMain.minus(MIN_BALANCE);
        return {
            confirmedBalance: confirmedBalance.toString(),
            unconfirmedBalance: '0',
            sweepable: this.isSweepableAddressBalance(amountMain),
        };
    }
    async getNextSequenceNumber(payportOrIndex) {
        const payport = await this.resolvePayport(payportOrIndex);
        const { address } = payport;
        const accountInfo = await this._retryDced(() => this.getApi().loadAccount(address));
        return new BigNumber(accountInfo.sequence).plus(1).toString();
    }
    resolveIndexFromAddressAndMemo(address, memo) {
        if (address === this.getHotSignatory().address) {
            return 0;
        }
        else if (address === this.getDepositSignatory().address) {
            if (memo) {
                const index = Number.parseInt(memo);
                if (!Number.isNaN(index)) {
                    return index;
                }
            }
            return 1;
        }
        return null;
    }
    async getLatestBlock() {
        const page = await this._retryDced(() => this.getApi().ledgers()
            .order('desc')
            .limit(1)
            .call());
        if (!page.records) {
            throw new Error('Failed to get stellar ledger records');
        }
        return page.records[0];
    }
    async getTransactionInfo(txId) {
        let tx;
        try {
            const txPage = await this._retryDced(() => this.getApi().transactions().transaction(txId).call());
            if (txPage.records) {
                tx = txPage.records[0];
            }
            else if (isStellarTransaction(txPage)) {
                tx = txPage;
            }
            else {
                throw new Error(`Transaction not found ${txId}`);
            }
        }
        catch (e) {
            const eString = e.toString();
            if (NOT_FOUND_ERRORS.some(type => eString.includes(type))) {
                throw new Error(`Transaction not found: ${eString}`);
            }
            throw e;
        }
        this.logger.debug('getTransactionInfo', txId, omitHidden(tx));
        const { amount, fee, fromAddress, toAddress } = await this._normalizeTxOperation(tx);
        const fromIndex = this.resolveIndexFromAddressAndMemo(fromAddress, tx.memo);
        const toIndex = this.resolveIndexFromAddressAndMemo(toAddress, tx.memo);
        const confirmationNumber = tx.ledger_attr;
        const ledger = await this._retryDced(() => tx.ledger());
        const currentLedger = await this.getLatestBlock();
        const currentLedgerSequence = currentLedger.sequence;
        const confirmationId = ledger.hash;
        const confirmationTimestamp = ledger.closed_at ? new Date(ledger.closed_at) : null;
        const confirmations = currentLedgerSequence - confirmationNumber;
        const sequenceNumber = tx.source_account_sequence;
        const isExecuted = tx.successful;
        const isConfirmed = Boolean(confirmationNumber);
        const status = isConfirmed || isExecuted ? paymentsCommon.TransactionStatus.Confirmed : paymentsCommon.TransactionStatus.Pending;
        return {
            status,
            id: tx.id,
            fromIndex,
            fromAddress,
            fromExtraId: null,
            toIndex,
            toAddress,
            toExtraId: tx.memo || null,
            amount: amount.toString(),
            fee: fee.toString(),
            sequenceNumber,
            confirmationId,
            confirmationNumber: String(confirmationNumber),
            confirmationTimestamp,
            isExecuted,
            isConfirmed,
            confirmations,
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
                throw new Error(`Unsupport stellar feeRateType ${feeOption.feeRateType}`);
            }
        }
        else {
            targetFeeLevel = feeOption.feeLevel || paymentsCommon.FeeLevel.Medium;
            const feeStats = await this._retryDced(() => this.getApi().feeStats());
            feeBase = feeStats.p10_accepted_fee;
            if (targetFeeLevel === paymentsCommon.FeeLevel.Medium) {
                feeBase = feeStats.p50_accepted_fee;
            }
            else if (targetFeeLevel === paymentsCommon.FeeLevel.High) {
                feeBase = feeStats.p95_accepted_fee;
            }
            feeMain = this.toMainDenomination(feeBase);
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
            throw new Error('stellar-payments createSweepTransaction missing required payportBalance option');
        }
        const payportBalance = new BigNumber(options.payportBalance);
        if (payportBalance.isNaN()) {
            throw new Error(`Invalid NaN payportBalance option provided: ${options.payportBalance}`);
        }
        return payportBalance;
    }
    getStellarNetwork() {
        return this.networkType === paymentsCommon.NetworkType.Testnet
            ? Stellar.Networks.TESTNET
            : Stellar.Networks.PUBLIC;
    }
    serializeTransaction(tx) {
        const xdr = tx.toEnvelope().toXDR('base64');
        return {
            serializedTx: xdr.toString()
        };
    }
    deserializeTransaction(txData) {
        return new Stellar.Transaction(txData.serializedTx, this.getStellarNetwork());
    }
    async doCreateTransaction(fromTo, feeOption, amount, payportBalance, options) {
        if (amount.isNaN() || amount.lte(0)) {
            throw new Error(`Invalid amount provided to stellar-payments createTransaction: ${amount}`);
        }
        const { fromIndex, fromAddress, fromExtraId, fromPayport, toIndex, toAddress, toExtraId } = fromTo;
        if (fromAddress === toAddress) {
            throw new Error('Cannot create XLM payment transaction sending XLM to self');
        }
        const { targetFeeLevel, targetFeeRate, targetFeeRateType, feeBase, feeMain } = feeOption;
        const seqNo = options.sequenceNumber;
        const sequenceNumber = tsCommon.toBigNumber(seqNo);
        const txTimeoutSecs = options.timeoutSeconds || this.config.txTimeoutSeconds || DEFAULT_TX_TIMEOUT_SECONDS;
        const amountString = amount.toString();
        const addressBalances = await this.getBalance({ address: fromAddress });
        const addressBalance = new BigNumber(addressBalances.confirmedBalance);
        const actualBalance = addressBalance.plus(MIN_BALANCE);
        if (addressBalance.lt(0)) {
            throw new Error(`Cannot send from stellar address that has less than ${MIN_BALANCE} XLM: ${fromAddress} (${actualBalance} XLM)`);
        }
        const totalValue = amount.plus(feeMain);
        if (addressBalance.minus(totalValue).lt(0)) {
            throw new Error(`Cannot send ${amountString} XLM with fee of ${feeMain} XLM because it would reduce the balance below ` +
                `the minimum required balance of ${MIN_BALANCE} XLM: ${fromAddress} (${actualBalance} XLM)`);
        }
        if (typeof fromExtraId === 'string' && totalValue.gt(payportBalance)) {
            throw new Error(`Insufficient payport balance of ${payportBalance} XLM to send ${amountString} XLM ` +
                `with fee of ${feeMain} XLM: ${serializePayport(fromPayport)}`);
        }
        const account = sequenceNumber
            ? new Stellar.Account(fromAddress, sequenceNumber.minus(1).toString())
            : await this.getApi().loadAccount(fromAddress);
        const preparedTx = new Stellar.TransactionBuilder(account, {
            fee: Number.parseInt(feeBase),
            networkPassphrase: this.getStellarNetwork(),
            memo: toExtraId ? Stellar.Memo.text(toExtraId) : undefined,
        })
            .addOperation(Stellar.Operation.payment({
            destination: toAddress,
            asset: Stellar.Asset.native(),
            amount: amount.toString(),
        }))
            .setTimeout(txTimeoutSecs)
            .build();
        const txData = this.serializeTransaction(preparedTx);
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
            sequenceNumber: preparedTx.sequence,
            data: txData,
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
            throw new Error(`Insufficient balance to sweep from stellar payport with fee of ${feeOption.feeMain} XLM: ` +
                `${serializePayport(fromPayport)} (${payportBalance} XLM)`);
        }
        return this.doCreateTransaction(fromTo, feeOption, amountBn, payportBalance, options);
    }
    async signTransaction(unsignedTx) {
        tsCommon.assertType(StellarUnsignedTransaction, unsignedTx);
        if (this.isReadOnly()) {
            throw new Error('Cannot sign transaction with read only stellar payments (no xprv or secrets provided)');
        }
        this.logger.debug('signTransaction', unsignedTx.data);
        const preparedTx = this.deserializeTransaction(unsignedTx.data);
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
            throw new Error(`Cannot sign stellar transaction from address ${unsignedTx.fromAddress}`);
        }
        const keypair = tsCommon.isString(secret) ? Stellar.Keypair.fromSecret(secret) : secret;
        preparedTx.sign(keypair);
        const signedData = this.serializeTransaction(preparedTx);
        return {
            ...unsignedTx,
            id: '',
            data: signedData,
            status: paymentsCommon.TransactionStatus.Signed,
        };
    }
    async broadcastTransaction(signedTx) {
        tsCommon.assertType(StellarSignedTransaction, signedTx);
        const preparedTx = this.deserializeTransaction(signedTx.data);
        let rebroadcast = false;
        try {
            const existing = await this.getTransactionInfo(signedTx.id);
            rebroadcast = existing.id === signedTx.id;
        }
        catch (e) { }
        const result = await this._retryDced(() => this.getApi().submitTransaction(preparedTx));
        this.logger.debug('broadcasted', omitHidden(result));
        return {
            id: result.hash,
            rebroadcast,
            data: result,
        };
    }
}

function deriveSignatory(seed, index) {
    const wallet = seed.includes(' ') ? StellarHDWallet.fromMnemonic(seed) : StellarHDWallet.fromSeed(seed);
    const keypair = wallet.getKeypair(index);
    const secret = keypair.secret();
    const address = keypair.publicKey();
    return {
        address,
        secret,
    };
}
function generateMnemonic() {
    return StellarHDWallet.generateMnemonic();
}

class AccountStellarPayments extends BaseStellarPayments {
    constructor(config) {
        super(config);
        this.readOnly = false;
        tsCommon.assertType(AccountStellarPaymentsConfig, config);
        this.hotSignatory = this.accountConfigToSignatory(config.hotAccount);
        this.depositSignatory = this.accountConfigToSignatory(config.depositAccount);
    }
    accountConfigToSignatory(accountConfig) {
        if (PartialStellarSignatory.is(accountConfig)) {
            if (!accountConfig.secret) {
                if (!accountConfig.address) {
                    throw new Error('Invalid StellarSecretPair, either secret or address required');
                }
                this.readOnly = true;
                return {
                    address: accountConfig.address,
                    secret: '',
                };
            }
            const keyPair = Stellar.Keypair.fromSecret(accountConfig.secret);
            return {
                address: keyPair.publicKey(),
                secret: keyPair.secret(),
            };
        }
        else if (isValidAddress(accountConfig)) {
            this.readOnly = true;
            return {
                address: accountConfig,
                secret: '',
            };
        }
        else if (isValidSecret(accountConfig)) ;
        throw new Error('Invalid stellar account config provided to stellar payments');
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
            throw new Error(`Invalid stellar payments accountId index ${index}`);
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

class HdStellarPayments extends AccountStellarPayments {
    constructor({ seed, ...config }) {
        super({
            ...config,
            hotAccount: deriveSignatory(seed, 0),
            depositAccount: deriveSignatory(seed, 1)
        });
    }
}
HdStellarPayments.generateMnemonic = generateMnemonic;

class StellarBalanceMonitor extends StellarConnected {
    constructor() {
        super(...arguments);
        this.txEmitter = new events.EventEmitter();
        this._subscribeCancellors = [];
    }
    async destroy() {
        this._subscribeCancellors.forEach((cancel) => cancel());
    }
    async subscribeAddresses(addresses) {
        for (let address of addresses) {
            assertValidAddress(address);
        }
        for (let address of addresses) {
            try {
                const cancel = this.getApi().transactions().cursor('now').forAccount(address).stream({
                    onmessage: (value) => {
                        this.txEmitter.emit('tx', { address, tx: value });
                    },
                    onerror: (e) => {
                        this.logger.error('Stellar tx stream error', e);
                    },
                });
                this.logger.log('Stellar address subscribed', address);
                this._subscribeCancellors.push(cancel);
            }
            catch (e) {
                this.logger.error('Failed to subscribe to stellar address', address, e.toString());
                throw e;
            }
        }
    }
    onBalanceActivity(callbackFn) {
        this.txEmitter.on('tx', async ({ address, tx }) => {
            const activity = await this.txToBalanceActivity(address, tx);
            if (activity) {
                callbackFn(activity);
            }
        });
    }
    async retrieveBalanceActivities(address, callbackFn, options = {}) {
        assertValidAddress(address);
        const { from: fromOption, to: toOption } = options;
        const from = new BigNumber(util.isUndefined(fromOption) ? 0 : (tsCommon.Numeric.is(fromOption) ? fromOption : fromOption.confirmationNumber));
        const to = new BigNumber(util.isUndefined(toOption) ? 'Infinity' : (tsCommon.Numeric.is(toOption) ? toOption.toString() : toOption.confirmationNumber));
        const limit = 10;
        let lastTx;
        let transactionPage;
        while (util.isUndefined(transactionPage) ||
            (transactionPage.records.length === limit
                && lastTx
                && (from.lt(lastTx.ledger_attr) || to.lt(lastTx.ledger_attr)))) {
            transactionPage = await this._retryDced(() => transactionPage
                ? transactionPage.next()
                : this.getApi()
                    .transactions()
                    .forAccount(address)
                    .limit(limit)
                    .order('desc')
                    .call());
            const transactions = transactionPage.records;
            this.logger.debug(`retrieved stellar txs for ${address}`, JSON.stringify(transactions.map(({ id }) => id)));
            for (let tx of transactions) {
                if ((lastTx && tx.id === lastTx.id) || !(from.lt(tx.ledger_attr) && to.gt(tx.ledger_attr))) {
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
    async txToBalanceActivity(address, tx) {
        const successful = tx.successful;
        if (!successful) {
            this.logger.log(`No balance activity for stellar tx ${tx.id} because successful is ${successful}`);
            return null;
        }
        const confirmationNumber = tx.ledger_attr;
        const primarySequence = padLeft(String(tx.ledger_attr), 12, '0');
        const secondarySequence = padLeft(String(new Date(tx.created_at).getTime()), 18, '0');
        const ledger = await this.getBlock(confirmationNumber);
        let operation;
        try {
            operation = await this._normalizeTxOperation(tx);
        }
        catch (e) {
            if (e.message.includes('Cannot normalize stellar tx')) {
                return null;
            }
            throw e;
        }
        const { amount, fee, fromAddress, toAddress } = operation;
        if (!(fromAddress === address || toAddress === address)) {
            this.logger.log(`Stellar transaction ${tx.id} operation does not apply to ${address}`);
            return null;
        }
        const type = toAddress === address ? 'in' : 'out';
        const extraId = toAddress === address ? tx.memo : null;
        const tertiarySequence = type === 'out' ? '00' : '01';
        const activitySequence = `${primarySequence}.${secondarySequence}.${tertiarySequence}`;
        const netAmount = type === 'out' ? amount.plus(fee).times(-1) : amount;
        return {
            type,
            networkType: this.networkType,
            networkSymbol: 'XLM',
            assetSymbol: 'XLM',
            address: address,
            extraId: !util.isUndefined(extraId) ? extraId : null,
            amount: netAmount.toString(),
            externalId: tx.id,
            activitySequence,
            confirmationId: ledger.hash,
            confirmationNumber: String(confirmationNumber),
            timestamp: new Date(ledger.closed_at),
        };
    }
}

class StellarPaymentsFactory {
    forConfig(config) {
        if (AccountStellarPaymentsConfig.is(config)) {
            return new AccountStellarPayments(config);
        }
        return new HdStellarPayments(tsCommon.assertType(HdStellarPaymentsConfig, config));
    }
}

exports.CreateTransactionOptions = paymentsCommon.CreateTransactionOptions;
exports.BaseStellarPayments = BaseStellarPayments;
exports.HdStellarPayments = HdStellarPayments;
exports.AccountStellarPayments = AccountStellarPayments;
exports.StellarPaymentsUtils = StellarPaymentsUtils;
exports.StellarBalanceMonitor = StellarBalanceMonitor;
exports.StellarPaymentsFactory = StellarPaymentsFactory;
exports.BaseStellarConfig = BaseStellarConfig;
exports.StellarBalanceMonitorConfig = StellarBalanceMonitorConfig;
exports.BaseStellarPaymentsConfig = BaseStellarPaymentsConfig;
exports.HdStellarPaymentsConfig = HdStellarPaymentsConfig;
exports.StellarSignatory = StellarSignatory;
exports.PartialStellarSignatory = PartialStellarSignatory;
exports.StellarAccountConfig = StellarAccountConfig;
exports.AccountStellarPaymentsConfig = AccountStellarPaymentsConfig;
exports.StellarPaymentsConfig = StellarPaymentsConfig;
exports.StellarUnsignedTransaction = StellarUnsignedTransaction;
exports.StellarSignedTransaction = StellarSignedTransaction;
exports.StellarTransactionInfo = StellarTransactionInfo;
exports.StellarBroadcastResult = StellarBroadcastResult;
exports.StellarCreateTransactionOptions = StellarCreateTransactionOptions;
exports.toMainDenominationBigNumber = toMainDenominationBigNumber;
exports.toMainDenominationString = toMainDenominationString;
exports.toMainDenominationNumber = toMainDenominationNumber;
exports.toBaseDenominationBigNumber = toBaseDenominationBigNumber;
exports.toBaseDenominationString = toBaseDenominationString;
exports.toBaseDenominationNumber = toBaseDenominationNumber;
exports.isValidAddress = isValidAddress;
exports.isValidExtraId = isValidExtraId;
exports.isValidSecret = isValidSecret;
exports.assertValidAddress = assertValidAddress;
exports.assertValidExtraId = assertValidExtraId;
exports.assertValidExtraIdOrNil = assertValidExtraIdOrNil;
//# sourceMappingURL=index.cjs.js.map
