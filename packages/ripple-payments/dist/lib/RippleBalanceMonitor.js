import { BalanceMonitor, } from '@faast/payments-common';
import { padLeft, resolveRippleServer, retryIfDisconnected } from './utils';
import { RippleBalanceMonitorConfig } from './types';
import { assertValidAddress } from './helpers';
import { isUndefined, isNumber, isString } from 'util';
import { assertType } from '@faast/ts-common';
export class RippleBalanceMonitor extends BalanceMonitor {
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
    async retryDced(fn) {
        return retryIfDisconnected(fn, this.rippleApi, this.logger);
    }
    async subscribeAddresses(addresses) {
        for (let address of addresses) {
            assertValidAddress(address);
        }
        try {
            const res = await this.retryDced(() => this.rippleApi.request('subscribe', { accounts: addresses }));
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
            const activity = await this.txToBalanceActivity(tx.address, tx);
            if (activity) {
                callbackFn(activity);
            }
        });
    }
    async resolveFromToLedgers(options) {
        const serverInfo = await this.retryDced(() => this.rippleApi.getServerInfo());
        const completeLedgers = serverInfo.completeLedgers.split('-');
        let fromLedgerVersion = Number.parseInt(completeLedgers[0]);
        let toLedgerVersion = Number.parseInt(completeLedgers[1]);
        const { from, to } = options;
        const requestedFrom = isUndefined(from) ? undefined : isNumber(from) ? from : from.confirmationNumber;
        const requestedTo = isUndefined(to) ? undefined : isNumber(to) ? to : to.confirmationNumber;
        if (isNumber(requestedFrom)) {
            if (requestedFrom < fromLedgerVersion) {
                this.logger.warn(`Server balance activity doesn't go back to ledger ${requestedFrom}, using ${fromLedgerVersion} instead`);
            }
            else {
                fromLedgerVersion = requestedFrom;
            }
        }
        if (isNumber(requestedTo)) {
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
        while (isUndefined(transactions) ||
            (transactions.length === limit && lastTx && lastTx.outcome.ledgerVersion <= to)) {
            const getTransactionOptions = {
                earliestFirst: true,
                excludeFailures: false,
                limit,
            };
            if (lastTx) {
                getTransactionOptions.start = lastTx.id;
            }
            else {
                getTransactionOptions.minLedgerVersion = from;
                getTransactionOptions.maxLedgerVersion = to;
            }
            transactions = await this.retryDced(() => this.rippleApi.getTransactions(address, getTransactionOptions));
            this.logger.debug(`retrieved ripple txs for ${address}`, transactions);
            for (let tx of transactions) {
                if ((lastTx && tx.id === lastTx.id) || tx.outcome.ledgerVersion < from || tx.outcome.ledgerVersion > to) {
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
    isPaymentTx(tx) {
        return tx.type === 'payment';
    }
    async txToBalanceActivity(address, tx) {
        if (!tx.outcome) {
            this.logger.warn('txToBalanceActivity received tx object without outcome!', tx);
            return null;
        }
        const txResult = tx.outcome.result;
        if (!isString(txResult) || !(txResult.startsWith('tes') || txResult.startsWith('tec'))) {
            this.logger.log(`No balance activity for ripple tx ${tx.id} because status is ${txResult}`);
            return null;
        }
        const confirmationNumber = tx.outcome.ledgerVersion;
        const primarySequence = padLeft(String(tx.outcome.ledgerVersion), 12, '0');
        const secondarySequence = padLeft(String(tx.outcome.indexInLedger), 8, '0');
        const ledger = await this.retryDced(() => this.rippleApi.getLedger({ ledgerVersion: confirmationNumber }));
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
            extraId: !isUndefined(tag) ? String(tag) : null,
            amount,
            externalId: tx.id,
            activitySequence,
            confirmationId: ledger.ledgerHash,
            confirmationNumber,
            timestamp: new Date(ledger.closeTime),
        };
    }
}
//# sourceMappingURL=RippleBalanceMonitor.js.map