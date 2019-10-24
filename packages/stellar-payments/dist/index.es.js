import { omit } from 'lodash';
import { union, string, nullType, number, type, partial, boolean, object } from 'io-ts';
import { BaseTransactionInfo, BaseUnsignedTransaction, BaseSignedTransaction, BaseBroadcastResult, CreateTransactionOptions, BaseConfig, NetworkType, createUnitConverters, Payport, FeeLevel, FeeRateType, TransactionStatus } from '@faast/payments-common';
export { CreateTransactionOptions } from '@faast/payments-common';
import promiseRetry from 'promise-retry';
import BigNumber from 'bignumber.js';
import StellarHDWallet from 'stellar-hd-wallet';
import 'bip39';
import { Networks, Transaction, Account, TransactionBuilder, Memo, Operation, Asset, Keypair, StrKey, Server } from 'stellar-sdk';
import { isString, isUndefined, isNumber } from 'util';
import { EventEmitter } from 'events';
import { extendCodec, instanceofCodec, nullable, isNil, isString as isString$1, isObject, assertType, DelegateLogger } from '@faast/ts-common';

const BaseStellarConfig = extendCodec(BaseConfig, {}, {
    server: union([string, instanceofCodec(Server), nullType]),
}, 'BaseStellarConfig');
const StellarBalanceMonitorConfig = BaseStellarConfig;
const BaseStellarPaymentsConfig = extendCodec(BaseStellarConfig, {}, {
    txTimeoutSeconds: number,
}, 'BaseStellarPaymentsConfig');
const HdStellarPaymentsConfig = extendCodec(BaseStellarPaymentsConfig, {
    seed: string,
}, 'HdStellarPaymentsConfig');
const StellarSignatory = type({
    address: string,
    secret: string,
}, 'StellarSignatory');
const PartialStellarSignatory = partial(StellarSignatory.props, 'PartialStellarSignatory');
const StellarAccountConfig = union([
    string, PartialStellarSignatory,
], 'StellarAccountConfig');
const AccountStellarPaymentsConfig = extendCodec(BaseStellarPaymentsConfig, {
    hotAccount: StellarAccountConfig,
    depositAccount: StellarAccountConfig,
}, 'AccountStellarPaymentsConfig');
const StellarPaymentsConfig = union([HdStellarPaymentsConfig, AccountStellarPaymentsConfig], 'StellarPaymentsConfig');
const StellarUnsignedTransaction = extendCodec(BaseUnsignedTransaction, {
    amount: string,
    fee: string,
}, 'StellarUnsignedTransaction');
const StellarSignedTransaction = extendCodec(BaseSignedTransaction, {}, 'StellarSignedTransaction');
const StellarTransactionInfo = extendCodec(BaseTransactionInfo, {
    confirmationNumber: nullable(number),
}, {}, 'StellarTransactionInfo');
const StellarBroadcastResult = extendCodec(BaseBroadcastResult, {
    rebroadcast: boolean,
    data: object,
}, 'StellarBroadcastResult');
const StellarCreateTransactionOptions = extendCodec(CreateTransactionOptions, {}, {
    timeoutSeconds: number,
}, 'StellarCreateTransactionOptions');

const PACKAGE_NAME = 'stellar-payments';
const DECIMAL_PLACES = 7;
const MIN_BALANCE = 1;
const DEFAULT_CREATE_TRANSACTION_OPTIONS = {};
const DEFAULT_TX_TIMEOUT_SECONDS = 5 * 60;
const NOT_FOUND_ERRORS = ['MissingLedgerHistoryError', 'NotFoundError'];
const DEFAULT_NETWORK = NetworkType.Mainnet;
const DEFAULT_MAINNET_SERVER = 'https://horizon.stellar.org';
const DEFAULT_TESTNET_SERVER = 'https://horizon-testnet.stellar.org';

const { toMainDenominationBigNumber, toMainDenominationString, toMainDenominationNumber, toBaseDenominationBigNumber, toBaseDenominationString, toBaseDenominationNumber, } = createUnitConverters(DECIMAL_PLACES);
function isValidAddress(address) {
    return isString(address) && StrKey.isValidEd25519PublicKey(address);
}
function isValidExtraId(extraId) {
    return isString(extraId);
}
function isValidSecret(secret) {
    return isString(secret) && StrKey.isValidEd25519SecretSeed(secret);
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
    if (!isNil(extraId) && !isValidExtraId(extraId)) {
        throw new Error(`Invalid stellar extraId: ${extraId}`);
    }
}

function isStellarLedger(x) {
    return isObject(x) && x.hasOwnProperty('successful_transaction_count');
}
function isStellarTransaction(x) {
    return isObject(x) && x.hasOwnProperty('source_account');
}
function padLeft(x, n, v) {
    while (x.length < n) {
        x = `${v}${x}`;
    }
    return x;
}
function resolveStellarServer(server, network) {
    if (typeof server === 'undefined') {
        server = network === NetworkType.Testnet ? DEFAULT_TESTNET_SERVER : DEFAULT_MAINNET_SERVER;
    }
    if (isString$1(server)) {
        return {
            api: new Server(server),
            server,
        };
    }
    else if (server instanceof Server) {
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
        assertType(BaseStellarConfig, config);
        this.networkType = config.network || DEFAULT_NETWORK;
        this.logger = new DelegateLogger(config.logger, PACKAGE_NAME);
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
        const op = opPage.records.find(({ type: type$$1 }) => type$$1 === 'create_account' || type$$1 === 'payment');
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
    async getPayportValidationMessage(payport) {
        const { address, extraId } = payport;
        if (!(await this.isValidAddress(address))) {
            return 'Invalid payport address';
        }
        if (!isNil(extraId) && !(await this.isValidExtraId(extraId))) {
            return 'Invalid payport extraId';
        }
    }
    async validatePayport(payport) {
        assertType(Payport, payport);
        const message = await this.getPayportValidationMessage(payport);
        if (message) {
            throw new Error(message);
        }
    }
    async isValidPayport(payport) {
        if (!Payport.is(payport)) {
            return false;
        }
        return !(await this.getPayportValidationMessage(payport));
    }
    toMainDenomination(amount) {
        return toMainDenominationString(amount);
    }
    toBaseDenomination(amount) {
        return toBaseDenominationString(amount);
    }
}

function serializePayport(payport) {
    return isNil(payport.extraId) ? payport.address : `${payport.address}/${payport.extraId}`;
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
            ...omit(this.config, ['logger', 'server']),
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
            if (isNil(payport.extraId)) {
                return this.isSweepableAddressBalance(balanceBase);
            }
        }
        return balanceBase.gt(0);
    }
    async getBalance(payportOrIndex) {
        const payport = await this.resolvePayport(payportOrIndex);
        const { address, extraId } = payport;
        if (!isNil(extraId)) {
            throw new Error(`Cannot getBalance of stellar payport with extraId ${extraId}, use BalanceMonitor instead`);
        }
        const accountInfo = await this._retryDced(() => this.getApi().loadAccount(address));
        this.logger.debug(`api.loadAccount ${address}`, accountInfo);
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
        return Number.parseInt(accountInfo.sequence) + 1;
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
            if (NOT_FOUND_ERRORS.some(type$$1 => eString.includes(type$$1))) {
                throw new Error(`Transaction not found: ${eString}`);
            }
            throw e;
        }
        this.logger.debug('tx', txId, tx);
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
        const sequenceNumber = Number.parseInt(tx.source_account_sequence);
        const isExecuted = tx.successful;
        const isConfirmed = Boolean(confirmationNumber);
        const status = isConfirmed || isExecuted ? TransactionStatus.Confirmed : TransactionStatus.Pending;
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
            confirmationNumber,
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
                throw new Error(`Unsupport stellar feeRateType ${feeOption.feeRateType}`);
            }
        }
        else {
            targetFeeLevel = feeOption.feeLevel || FeeLevel.Medium;
            const feeStats = await this._retryDced(() => this.getApi().feeStats());
            feeBase = feeStats.p10_accepted_fee;
            if (targetFeeLevel === FeeLevel.Medium) {
                feeBase = feeStats.p50_accepted_fee;
            }
            else if (targetFeeLevel === FeeLevel.High) {
                feeBase = feeStats.p95_accepted_fee;
            }
            feeMain = this.toMainDenomination(feeBase);
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
            throw new Error('stellar-payments createSweepTransaction missing required payportBalance option');
        }
        const payportBalance = new BigNumber(options.payportBalance);
        if (payportBalance.isNaN()) {
            throw new Error(`Invalid NaN payportBalance option provided: ${options.payportBalance}`);
        }
        return payportBalance;
    }
    getStellarNetwork() {
        return this.networkType === NetworkType.Testnet
            ? Networks.TESTNET
            : Networks.PUBLIC;
    }
    serializeTransaction(tx) {
        const xdr = tx.toEnvelope().toXDR('base64');
        return {
            serializedTx: xdr.toString()
        };
    }
    deserializeTransaction(txData) {
        return new Transaction(txData.serializedTx, this.getStellarNetwork());
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
        const { sequenceNumber } = options;
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
            ? new Account(fromAddress, sequenceNumber.toString())
            : await this.getApi().loadAccount(fromAddress);
        const preparedTx = new TransactionBuilder(account, {
            fee: Number.parseInt(feeBase),
            networkPassphrase: this.getStellarNetwork(),
            memo: toExtraId ? Memo.text(toExtraId) : undefined,
        })
            .addOperation(Operation.payment({
            destination: toAddress,
            asset: Asset.native(),
            amount: amount.toString(),
        }))
            .setTimeout(txTimeoutSecs)
            .build();
        const txData = this.serializeTransaction(preparedTx);
        return {
            status: TransactionStatus.Unsigned,
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
            sequenceNumber: Number.parseInt(preparedTx.sequence),
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
        assertType(StellarUnsignedTransaction, unsignedTx);
        if (this.isReadOnly()) {
            throw new Error('Cannot sign transaction with read only stellar payments (no xprv or secrets provided)');
        }
        this.logger.debug('signTransaction', unsignedTx.data);
        const preparedTx = this.deserializeTransaction(unsignedTx.data);
        this.logger.debug('preparedTx', JSON.stringify(preparedTx, null, 2));
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
        const keypair = isString$1(secret) ? Keypair.fromSecret(secret) : secret;
        preparedTx.sign(keypair);
        const signedData = this.serializeTransaction(preparedTx);
        return {
            ...unsignedTx,
            id: '',
            data: signedData,
            status: TransactionStatus.Signed,
        };
    }
    async broadcastTransaction(signedTx) {
        assertType(StellarSignedTransaction, signedTx);
        const preparedTx = this.deserializeTransaction(signedTx.data);
        let rebroadcast = false;
        try {
            const existing = await this.getTransactionInfo(signedTx.id);
            rebroadcast = existing.id === signedTx.id;
        }
        catch (e) { }
        const result = await this._retryDced(() => this.getApi().submitTransaction(preparedTx));
        this.logger.debug('broadcasted', result);
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
        assertType(AccountStellarPaymentsConfig, config);
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
            const keyPair = Keypair.fromSecret(accountConfig.secret);
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
        this.txEmitter = new EventEmitter();
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
    async resolveFromToLedgers(options) {
        const { from, to } = options;
        const resolvedFrom = isUndefined(from) ? 0 : isNumber(from) ? from : from.confirmationNumber;
        const resolvedTo = isUndefined(to) ? Number.MAX_SAFE_INTEGER : isNumber(to) ? to : to.confirmationNumber;
        return {
            from: resolvedFrom,
            to: resolvedTo,
        };
    }
    async retrieveBalanceActivities(address, callbackFn, options = {}) {
        assertValidAddress(address);
        const { from, to } = await this.resolveFromToLedgers(options);
        const limit = 10;
        let lastTx;
        let transactionPage;
        while (isUndefined(transactionPage) ||
            (transactionPage.records.length === limit
                && lastTx
                && (lastTx.ledger_attr >= from || lastTx.ledger_attr >= to))) {
            transactionPage = await this._retryDced(() => transactionPage
                ? transactionPage.next()
                : this.getApi()
                    .transactions()
                    .forAccount(address)
                    .limit(limit)
                    .order('desc')
                    .call());
            const transactions = transactionPage.records;
            this.logger.debug(`retrieved stellar txs for ${address}`, transactions);
            for (let tx of transactions) {
                if ((lastTx && tx.id === lastTx.id) || !(tx.ledger_attr >= from && tx.ledger_attr <= to)) {
                    continue;
                }
                const activity = await this.txToBalanceActivity(address, tx);
                if (activity) {
                    await callbackFn(activity);
                }
            }
            lastTx = transactions[transactions.length - 1];
        }
        return { from, to };
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
        const type$$1 = toAddress === address ? 'in' : 'out';
        const extraId = toAddress === address ? tx.memo : null;
        const tertiarySequence = type$$1 === 'out' ? '00' : '01';
        const activitySequence = `${primarySequence}.${secondarySequence}.${tertiarySequence}`;
        const netAmount = type$$1 === 'out' ? amount.plus(fee).times(-1) : amount;
        return {
            type: type$$1,
            networkType: this.networkType,
            networkSymbol: 'XLM',
            assetSymbol: 'XLM',
            address: address,
            extraId: !isUndefined(extraId) ? extraId : null,
            amount: netAmount.toString(),
            externalId: tx.id,
            activitySequence,
            confirmationId: ledger.hash,
            confirmationNumber,
            timestamp: new Date(ledger.closed_at),
        };
    }
}

class StellarPaymentsFactory {
    forConfig(config) {
        if (AccountStellarPaymentsConfig.is(config)) {
            return new AccountStellarPayments(config);
        }
        return new HdStellarPayments(assertType(HdStellarPaymentsConfig, config));
    }
}

export { BaseStellarPayments, HdStellarPayments, AccountStellarPayments, StellarPaymentsUtils, StellarBalanceMonitor, StellarPaymentsFactory, BaseStellarConfig, StellarBalanceMonitorConfig, BaseStellarPaymentsConfig, HdStellarPaymentsConfig, StellarSignatory, PartialStellarSignatory, StellarAccountConfig, AccountStellarPaymentsConfig, StellarPaymentsConfig, StellarUnsignedTransaction, StellarSignedTransaction, StellarTransactionInfo, StellarBroadcastResult, StellarCreateTransactionOptions, toMainDenominationBigNumber, toMainDenominationString, toMainDenominationNumber, toBaseDenominationBigNumber, toBaseDenominationString, toBaseDenominationNumber, isValidAddress, isValidExtraId, isValidSecret, assertValidAddress, assertValidExtraId, assertValidExtraIdOrNil };
//# sourceMappingURL=index.es.js.map
