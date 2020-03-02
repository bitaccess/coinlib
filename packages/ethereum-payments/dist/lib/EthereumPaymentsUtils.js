import Web3 from 'web3';
const web3 = new Web3();
import { BigNumber } from 'bignumber.js';
import { Payport } from '@faast/payments-common';
import { DelegateLogger, assertType } from '@faast/ts-common';
import { PACKAGE_NAME, DECIMAL_PLACES } from './constants';
import { isValidXkey } from './bip44';
export class EthereumPaymentsUtils {
    constructor(config) {
        this.logger = new DelegateLogger(config.logger, PACKAGE_NAME);
    }
    toBaseDenomination(amount, options) {
        const eth = (new BigNumber(amount)).toFixed(DECIMAL_PLACES, options ? options.rounding : undefined);
        return web3.utils.toWei(eth);
    }
    toMainDenomination(amount, options) {
        const wei = (new BigNumber(amount)).toFixed(0, options ? options.rounding : undefined);
        return web3.utils.fromWei(wei);
    }
    async isValidAddress(address) {
        return web3.utils.isAddress(address);
    }
    async isValidExtraId(extraId) {
        return false;
    }
    async isValidPayport(payport) {
        return Payport.is(payport) && !await this._getPayportValidationMessage(payport);
    }
    async validatePayport(payport) {
        const message = await this._getPayportValidationMessage(payport);
        if (message) {
            throw new Error(message);
        }
    }
    async getPayportValidationMessage(payport) {
        try {
            payport = assertType(Payport, payport, 'payport');
        }
        catch (e) {
            return e.message;
        }
        return this._getPayportValidationMessage(payport);
    }
    isValidXprv(xprv) {
        return isValidXkey(xprv) && xprv.substring(0, 4) === 'xprv';
    }
    isValidXpub(xpub) {
        return isValidXkey(xpub) && xpub.substring(0, 4) === 'xpub';
    }
    isValidPrivateKey(prv) {
        try {
            return !!web3.eth.accounts.privateKeyToAccount(prv);
        }
        catch (e) {
            return false;
        }
    }
    privateKeyToAddress(prv) {
        let key;
        if (prv.substring(0, 2) === '0x') {
            key = prv;
        }
        else {
            key = `0x${prv}`;
        }
        return web3.eth.accounts.privateKeyToAccount(key).address;
    }
    async _getPayportValidationMessage(payport) {
        try {
            const { address } = payport;
            if (!(await this.isValidAddress(address))) {
                return 'Invalid payport address';
            }
        }
        catch (e) {
            return 'Invalid payport address';
        }
        return undefined;
    }
}
//# sourceMappingURL=EthereumPaymentsUtils.js.map