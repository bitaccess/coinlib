import TronWeb from 'tronweb';
import { pick, get, cloneDeep } from 'lodash';
import { TransactionStatus, FeeLevel, FeeRateType, FeeOptionCustom, } from '@faast/payments-common';
import { isType } from '@faast/ts-common';
import { toMainDenomination, toBaseDenomination, toBaseDenominationNumber, toError, isValidAddress, isValidPrivateKey, privateKeyToAddress, } from './utils';
import { DEFAULT_FULL_NODE, DEFAULT_EVENT_SERVER, DEFAULT_SOLIDITY_NODE, MIN_BALANCE_SUN, MIN_BALANCE_TRX, } from './constants';
export class BaseTronPayments {
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
export default BaseTronPayments;
//# sourceMappingURL=BaseTronPayments.js.map