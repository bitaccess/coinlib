import Web3 from 'web3';
const web3 = new Web3();
import { BaseEthereumPayments } from './BaseEthereumPayments';
import { omit } from 'lodash';
import { deriveSignatory } from '../src/bip44';
export class KeyPairEthereumPayments extends BaseEthereumPayments {
    constructor(config) {
        super(config);
        this.addresses = {};
        this.privateKeys = {};
        this.addressIndices = {};
        Object.entries(config.keyPairs).forEach(([key, value]) => {
            if (typeof value === 'undefined' || value === null) {
                return;
            }
            const i = Number.parseInt(key);
            let address;
            let pkey = null;
            if (web3.utils.isAddress(value)) {
                address = value;
            }
            else if (this.isValidPrivateKey(value)) {
                address = this.privateKeyToAddress(value).toLowerCase();
            }
            else if (this.isValidXprv(value)) {
                const signatory = deriveSignatory(value);
                address = signatory.address;
                pkey = signatory.keys.prv;
            }
            else {
                throw new Error(`KeyPairEthereumPaymentsConfig.keyPairs[${i}] is not a valid private key or address`);
            }
            if (typeof this.addressIndices[address] === 'number') {
                return;
            }
            this.addresses[i] = address;
            this.privateKeys[i] = pkey;
            this.addressIndices[address] = i;
        });
    }
    getPublicConfig() {
        return {
            ...omit(this.getFullConfig(), ['logger', 'fullNode', 'solidityNode', 'eventServer', 'keyPairs']),
            keyPairs: this.addresses,
        };
    }
    getAccountId(index) {
        const accountId = this.addresses[index] || '';
        if (!accountId) {
            throw new Error(`No KeyPairEthereumPayments account configured at index ${index}`);
        }
        return accountId;
    }
    getAccountIds() {
        return Object.keys(this.addressIndices);
    }
    async getPayport(index) {
        const address = this.addresses[index] || '';
        if (!await this.isValidAddress(address)) {
            throw new Error(`Cannot get address ${index} - keyPair[${index}] is undefined or invalid address`);
        }
        return { address };
    }
    async getPrivateKey(index) {
        const privateKey = this.privateKeys[index] || '';
        if (!this.isValidPrivateKey(privateKey)) {
            throw new Error(`Cannot get private key ${index} - keyPair[${index}] is undefined`);
        }
        return privateKey;
    }
}
export default KeyPairEthereumPayments;
//# sourceMappingURL=KeyPairEthereumPayments.js.map