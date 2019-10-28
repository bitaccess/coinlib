import { padLeft, omitHidden } from './utils';
import { assertValidAddress } from './helpers';
import { isUndefined, isNumber } from 'util';
import { StellarConnected } from './StellarConnected';
import { EventEmitter } from 'events';
export class StellarBalanceMonitor extends StellarConnected {
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
        let transactions;
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
            this.logger.debug(`retrieved stellar txs for ${address}`, omitHidden(transactions));
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
//# sourceMappingURL=StellarBalanceMonitor.js.map