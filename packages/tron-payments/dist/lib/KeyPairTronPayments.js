import { BaseTronPayments } from './BaseTronPayments';
import { isValidAddress, isValidPrivateKey, privateKeyToAddress } from './utils';
export class KeyPairTronPayments extends BaseTronPayments {
    constructor(config) {
        super(config);
        this.config = config;
        this.addresses = {};
        this.privateKeys = {};
        this.addressIndices = {};
        Object.entries(config.keyPairs).forEach(([iString, addressOrKey]) => {
            if (typeof addressOrKey === 'undefined' || addressOrKey === null) {
                return;
            }
            const i = Number.parseInt(iString);
            if (isValidAddress(addressOrKey)) {
                this.addresses[i] = addressOrKey;
                this.privateKeys[i] = null;
                this.addressIndices[addressOrKey] = i;
                return;
            }
            if (isValidPrivateKey(addressOrKey)) {
                const address = privateKeyToAddress(addressOrKey);
                this.addresses[i] = address;
                this.privateKeys[i] = addressOrKey;
                this.addressIndices[address] = i;
                return;
            }
            throw new Error(`KeyPairTronPaymentsConfig.keyPairs[${i}] is not a valid private key or address`);
        });
    }
    getFullConfig() {
        return this.config;
    }
    getPublicConfig() {
        return {
            ...this.config,
            keyPairs: this.addresses,
        };
    }
    getAccountId(index) {
        const accountId = this.addresses[index];
        if (!accountId) {
            throw new Error(`No KeyPairTronPayments account configured at index ${index}`);
        }
        return accountId;
    }
    getAccountIds() {
        return Object.keys(this.addressIndices);
    }
    async getAddress(index) {
        const address = this.addresses[index];
        if (typeof address === 'undefined') {
            throw new Error(`Cannot get address ${index} - keyPair[${index}] is undefined`);
        }
        return address;
    }
    async getAddressIndex(address) {
        const index = this.addressIndices[address];
        if (typeof index === 'undefined') {
            throw new Error(`Cannot get index of address ${address}`);
        }
        return index;
    }
    async getPrivateKey(index) {
        const privateKey = this.privateKeys[index];
        if (typeof privateKey === 'undefined') {
            throw new Error(`Cannot get private key ${index} - keyPair[${index}] is undefined`);
        }
        if (privateKey === null) {
            throw new Error(`Cannot get private key ${index} - keyPair[${index}] is a public address`);
        }
        return privateKey;
    }
}
export default KeyPairTronPayments;
//# sourceMappingURL=KeyPairTronPayments.js.map