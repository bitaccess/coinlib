import { FeeLevel, FeeRateType, TransactionStatus, NetworkType, } from '@faast/payments-common';
import { assertType, isNil, isString } from '@faast/ts-common';
import BigNumber from 'bignumber.js';
import { omit } from 'lodash';
import { StellarUnsignedTransaction, StellarSignedTransaction, } from './types';
import { StellarPaymentsUtils } from './StellarPaymentsUtil';
import { DEFAULT_CREATE_TRANSACTION_OPTIONS, MIN_BALANCE, NOT_FOUND_ERRORS, DEFAULT_TX_TIMEOUT_SECONDS, } from './constants';
import { assertValidAddress, assertValidExtraIdOrNil, toBaseDenominationBigNumber } from './helpers';
import * as Stellar from 'stellar-sdk';
import { isStellarTransaction } from './utils';
function extraIdToTag(extraId) {
    return isNil(extraId) ? undefined : Number.parseInt(extraId);
}
function serializePayport(payport) {
    return isNil(payport.extraId) ? payport.address : `${payport.address}/${payport.extraId}`;
}
export class BaseStellarPayments extends StellarPaymentsUtils {
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
            if (NOT_FOUND_ERRORS.some(type => eString.includes(type))) {
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
            ? new Stellar.Account(fromAddress, sequenceNumber.toString())
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
        const keypair = isString(secret) ? Stellar.Keypair.fromSecret(secret) : secret;
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
//# sourceMappingURL=BaseStellarPayments.js.map