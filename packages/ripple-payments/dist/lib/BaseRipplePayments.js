import { FeeLevel, FeeRateType, TransactionStatus, } from '@faast/payments-common';
import { assertType, isNil } from '@faast/ts-common';
import BigNumber from 'bignumber.js';
import { BaseRipplePaymentsConfig, RippleUnsignedTransaction, RippleSignedTransaction, } from './types';
import { RipplePaymentsUtils } from './RipplePaymentsUtils';
import { DEFAULT_CREATE_TRANSACTION_OPTIONS, MIN_BALANCE, DEFAULT_MAX_LEDGER_VERSION_OFFSET, NOT_FOUND_ERRORS, } from './constants';
import { assertValidAddress, assertValidExtraIdOrNil, toBaseDenominationBigNumber } from './helpers';
import { resolveRippleServer } from './utils';
function extraIdToTag(extraId) {
    return isNil(extraId) ? undefined : Number.parseInt(extraId);
}
function serializePayport(payport) {
    return isNil(payport.extraId) ? payport.address : `${payport.address}:${payport.extraId}`;
}
export class BaseRipplePayments extends RipplePaymentsUtils {
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
        return new BigNumber(balance).gt(MIN_BALANCE);
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
            throw new Error(`Cannot getBalance of ripple payport with extraId ${extraId}, use BalanceMonitor instead`);
        }
        const balances = await this.rippleApi.getBalances(address);
        this.logger.debug(`rippleApi.getBalance ${address}`, balances);
        const xrpBalance = balances.find(({ currency }) => currency === 'XRP');
        const xrpAmount = xrpBalance && xrpBalance.value ? xrpBalance.value : '0';
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
            if (NOT_FOUND_ERRORS.some(type => eString.includes(type))) {
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
        const { fromIndex, fromAddress, fromExtraId, fromPayport, toIndex, toAddress, toExtraId } = fromTo;
        if (fromAddress === toAddress) {
            throw new Error('Cannot create XRP payment transaction sending XRP to self');
        }
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
//# sourceMappingURL=BaseRipplePayments.js.map