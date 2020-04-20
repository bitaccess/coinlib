import { SinglesigBitcoinPayments } from './SinglesigBitcoinPayments';
import { omit } from 'lodash';
import { privateKeyToKeyPair, publicKeyToAddress, publicKeyToKeyPair, publicKeyToString, } from './helpers';
import { isUndefined, isString } from '@faast/ts-common';
export class KeyPairBitcoinPayments extends SinglesigBitcoinPayments {
    constructor(config) {
        super(config);
        this.config = config;
        this.publicKeys = {};
        this.privateKeys = {};
        this.addresses = {};
        Object.entries(config.keyPairs).forEach(([key, value]) => {
            if (typeof value === 'undefined' || value === null) {
                return;
            }
            const i = Number.parseInt(key);
            let publicKey;
            let privateKey = null;
            if (this.isValidPublicKey(value)) {
                publicKey = value;
            }
            else if (this.isValidPrivateKey(value)) {
                publicKey = privateKeyToKeyPair(value, this.bitcoinjsNetwork).publicKey;
                privateKey = value;
            }
            else {
                throw new Error(`KeyPairBitcoinPaymentsConfig.keyPairs[${i}] is not a valid ${this.networkType} private key or address`);
            }
            const address = publicKeyToAddress(publicKey, this.bitcoinjsNetwork, this.addressType);
            this.publicKeys[i] = publicKeyToString(publicKey);
            this.privateKeys[i] = privateKey;
            this.addresses[i] = address;
        });
    }
    getFullConfig() {
        return {
            ...this.config,
            network: this.networkType,
            addressType: this.addressType,
        };
    }
    getPublicConfig() {
        return {
            ...omit(this.getFullConfig(), ['logger', 'server', 'keyPairs']),
            keyPairs: this.publicKeys,
        };
    }
    getAccountId(index) {
        const accountId = this.publicKeys[index] || '';
        if (!accountId) {
            throw new Error(`No KeyPairBitcoinPayments account configured at index ${index}`);
        }
        return accountId;
    }
    getAccountIds(index) {
        if (!isUndefined(index)) {
            return [this.getAccountId(index)];
        }
        return Object.values(this.publicKeys).filter(isString);
    }
    getKeyPair(index) {
        const privateKey = this.privateKeys[index];
        if (privateKey) {
            return privateKeyToKeyPair(privateKey, this.bitcoinjsNetwork);
        }
        const publicKey = this.publicKeys[index] || '';
        if (!this.isValidPublicKey(publicKey)) {
            throw new Error(`Cannot get publicKey ${index} - keyPair[${index}] is undefined or invalid`);
        }
        return publicKeyToKeyPair(publicKey, this.bitcoinjsNetwork);
    }
    getAddress(index) {
        const address = this.addresses[index] || '';
        if (!this.isValidAddress(address)) {
            throw new Error(`Cannot get address ${index} - keyPair[${index}] is undefined or invalid address`);
        }
        return address;
    }
    getPrivateKey(index) {
        const privateKey = this.privateKeys[index] || '';
        if (!this.isValidPrivateKey(privateKey)) {
            throw new Error(`Cannot get private key ${index} - keyPair[${index}] is undefined`);
        }
        return privateKey;
    }
}
export default KeyPairBitcoinPayments;
//# sourceMappingURL=KeyPairBitcoinPayments.js.map