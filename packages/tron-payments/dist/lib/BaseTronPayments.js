import TronWeb from 'tronweb';
import { pick, get, cloneDeep } from 'lodash';
import { TransactionStatus, FeeLevel, FeeRateType, FeeOptionCustom, } from '@faast/payments-common';
import { isType, DelegateLogger } from '@faast/ts-common';
import { toBaseDenominationNumber, isValidAddress, isValidPayport } from './helpers';
import { toError } from './utils';
import { DEFAULT_FULL_NODE, DEFAULT_EVENT_SERVER, DEFAULT_SOLIDITY_NODE, MIN_BALANCE_SUN, MIN_BALANCE_TRX, PACKAGE_NAME, DEFAULT_FEE_LEVEL, } from './constants';
import { TronPaymentsUtils } from './TronPaymentsUtils';
export class BaseTronPayments extends TronPaymentsUtils {
    constructor(config) {
        super(config);
        this.fullNode = config.fullNode || DEFAULT_FULL_NODE;
        this.solidityNode = config.solidityNode || DEFAULT_SOLIDITY_NODE;
        this.eventServer = config.eventServer || DEFAULT_EVENT_SERVER;
        this.logger = new DelegateLogger(config.logger, PACKAGE_NAME);
        this.tronweb = new TronWeb(this.fullNode, this.solidityNode, this.eventServer);
    }
    async init() { }
    async destroy() { }
    requiresBalanceMonitor() {
        return false;
    }
    async getBalance(resolveablePayport) {
        try {
            const payport = await this.resolvePayport(resolveablePayport);
            const balanceSun = await this.tronweb.trx.getBalance(payport.address);
            this.logger.debug(`trx.getBalance(${payport.address}) -> ${balanceSun}`);
            const sweepable = this.canSweepBalance(balanceSun);
            return {
                confirmedBalance: this.toMainDenomination(balanceSun).toString(),
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
            targetFeeLevel = feeOption.feeLevel || DEFAULT_FEE_LEVEL;
        }
        return {
            targetFeeLevel,
            targetFeeRate: '0',
            targetFeeRateType: FeeRateType.Base,
            feeBase: '0',
            feeMain: '0',
        };
    }
    async createSweepTransaction(from, to, options = {}) {
        this.logger.debug('createSweepTransaction', from, to);
        try {
            const { fromAddress, fromIndex, fromPayport, toAddress, toIndex } = await this.resolveFromTo(from, to);
            const { targetFeeLevel, targetFeeRate, targetFeeRateType, feeBase, feeMain } = await this.resolveFeeOption(options);
            const feeSun = Number.parseInt(feeBase);
            const { confirmedBalance: balanceTrx } = await this.getBalance(fromPayport);
            const balanceSun = toBaseDenominationNumber(balanceTrx);
            if (!this.canSweepBalance(balanceSun)) {
                throw new Error(`Insufficient balance (${balanceTrx}) to sweep with fee of ${feeMain} ` +
                    `while maintaining a minimum required balance of ${MIN_BALANCE_TRX}`);
            }
            const amountSun = balanceSun - feeSun - MIN_BALANCE_SUN;
            const amountTrx = this.toMainDenomination(amountSun);
            const tx = await this.tronweb.transactionBuilder.sendTrx(toAddress, amountSun, fromAddress);
            return {
                status: TransactionStatus.Unsigned,
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
                sequenceNumber: null,
                data: tx,
            };
        }
        catch (e) {
            throw toError(e);
        }
    }
    async createTransaction(from, to, amountTrx, options = {}) {
        this.logger.debug('createTransaction', from, to, amountTrx);
        try {
            const { fromAddress, fromIndex, fromPayport, toAddress, toIndex } = await this.resolveFromTo(from, to);
            const { targetFeeLevel, targetFeeRate, targetFeeRateType, feeBase, feeMain } = await this.resolveFeeOption(options);
            const feeSun = Number.parseInt(feeBase);
            const { confirmedBalance: balanceTrx } = await this.getBalance(fromPayport);
            const balanceSun = toBaseDenominationNumber(balanceTrx);
            const amountSun = toBaseDenominationNumber(amountTrx);
            if (balanceSun - feeSun - MIN_BALANCE_SUN < amountSun) {
                throw new Error(`Insufficient balance (${balanceTrx}) to send ${amountTrx} including fee of ${feeMain} ` +
                    `while maintaining a minimum required balance of ${MIN_BALANCE_TRX}`);
            }
            const tx = await this.tronweb.transactionBuilder.sendTrx(toAddress, amountSun, fromAddress);
            return {
                status: TransactionStatus.Unsigned,
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
                sequenceNumber: null,
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
                status: TransactionStatus.Signed,
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
                this.logger.warn(`Tron broadcast tx unsuccessful ${tx.id}`, status);
                throw new Error(`Failed to broadcast transaction: ${statusCode} ${status.message}`);
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
            const contractRet = get(tx, 'ret[0].contractRet');
            const isExecuted = contractRet === 'SUCCESS';
            const block = txInfo.blockNumber || null;
            const feeTrx = this.toMainDenomination(txInfo.fee || 0);
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
                fromIndex: null,
                toIndex: null,
                fee: feeTrx,
                sequenceNumber: null,
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
    isSweepableBalance(balanceTrx) {
        return this.canSweepBalance(toBaseDenominationNumber(balanceTrx));
    }
    async getNextSequenceNumber() {
        return null;
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
        const amountTrx = this.toMainDenomination(amountSun);
        const toAddress = this.tronweb.address.fromHex(contractParam.to_address);
        const fromAddress = this.tronweb.address.fromHex(contractParam.owner_address);
        return {
            amountTrx,
            amountSun,
            toAddress,
            fromAddress,
        };
    }
    async resolvePayport(payport) {
        if (typeof payport === 'number') {
            return this.getPayport(payport);
        }
        else if (typeof payport === 'string') {
            if (!isValidAddress(payport)) {
                throw new Error(`Invalid TRON address: ${payport}`);
            }
            return { address: payport };
        }
        if (!isValidPayport(payport)) {
            throw new Error(`Invalid TRON payport: ${JSON.stringify(payport)}`);
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
}
export default BaseTronPayments;
//# sourceMappingURL=BaseTronPayments.js.map