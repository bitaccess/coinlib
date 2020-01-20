import { FeeLevel, FeeRateType, TransactionStatus, PaymentsError, PaymentsErrorCode, } from '@faast/payments-common';
import { assertType, isNil, isUndefined } from '@faast/ts-common';
import BigNumber from 'bignumber.js';
import { omit } from 'lodash';
import { RippleUnsignedTransaction, RippleSignedTransaction, } from './types';
import { RipplePaymentsUtils } from './RipplePaymentsUtils';
import { DEFAULT_CREATE_TRANSACTION_OPTIONS, MIN_BALANCE, DEFAULT_MAX_LEDGER_VERSION_OFFSET, NOT_FOUND_ERRORS, } from './constants';
import { assertValidAddress, assertValidExtraIdOrNil, toBaseDenominationBigNumber } from './helpers';
function extraIdToTag(extraId) {
    return isNil(extraId) ? undefined : Number.parseInt(extraId);
}
function serializePayport(payport) {
    return isNil(payport.extraId) ? payport.address : `${payport.address}/${payport.extraId}`;
}
export class BaseRipplePayments extends RipplePaymentsUtils {
    constructor(config) {
        super(config);
        this.config = config;
    }
    getFullConfig() {
        return this.config;
    }
    getPublicConfig() {
        return {
            ...omit(this.config, ['logger', 'server', 'hdKey']),
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
        const { feeMain } = await this.resolveFeeOption({ feeLevel: FeeLevel.Medium });
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
        if (!isNil(extraId)) {
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
    usesUtxos() {
        return false;
    }
    async getAvailableUtxos() {
        return [];
    }
    usesSequenceNumber() {
        return true;
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
        const status = isSuccessful || isCostDestroyed ? TransactionStatus.Confirmed : TransactionStatus.Failed;
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
            feeMain = await this._retryDced(() => this.api.getFee(cushion));
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
            sequence: isUndefined(sequenceNumber) ? sequenceNumber : new BigNumber(sequenceNumber).toNumber(),
        }));
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
        assertType(RippleUnsignedTransaction, unsignedTx);
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
        const result = (await this._retryDced(() => this.api.submit(signedTxString)));
        this.logger.debug('broadcasted', result);
        const resultCode = result.engine_result || result.resultCode || '';
        if (resultCode === 'terPRE_SEQ') {
            throw new PaymentsError(PaymentsErrorCode.TxSequenceTooHigh, resultCode);
        }
        if (!rebroadcast) {
            if (resultCode === 'tefPAST_SEQ') {
                throw new PaymentsError(PaymentsErrorCode.TxSequenceCollision, resultCode);
            }
            if (resultCode === 'tefMAX_LEDGER') {
                throw new PaymentsError(PaymentsErrorCode.TxExpired, resultCode);
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
//# sourceMappingURL=BaseRipplePayments.js.map