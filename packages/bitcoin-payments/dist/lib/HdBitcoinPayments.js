import { omit } from 'lodash';
import { assertType, } from '@faast/ts-common';
import { xprvToXpub, deriveAddress, deriveHDNode, deriveKeyPair } from './bip44';
import { HdBitcoinPaymentsConfig, } from './types';
import { BaseBitcoinPayments } from './BaseBitcoinPayments';
import { DEFAULT_DERIVATION_PATHS } from './constants';
import { isValidXprv, isValidXpub, validateHdKey } from './helpers';
import { bip32MagicNumberToPrefix } from './utils';
export class HdBitcoinPayments extends BaseBitcoinPayments {
    constructor(config) {
        super(config);
        this.config = config;
        assertType(HdBitcoinPaymentsConfig, config);
        this.derivationPath = config.derivationPath || DEFAULT_DERIVATION_PATHS[this.addressType];
        if (this.isValidXpub(config.hdKey)) {
            this.xpub = config.hdKey;
            this.xprv = null;
        }
        else if (this.isValidXprv(config.hdKey)) {
            this.xpub = xprvToXpub(config.hdKey, this.derivationPath, this.bitcoinjsNetwork);
            this.xprv = config.hdKey;
        }
        else {
            const providedPrefix = config.hdKey.slice(0, 4);
            const xpubPrefix = bip32MagicNumberToPrefix(this.bitcoinjsNetwork.bip32.public);
            const xprvPrefix = bip32MagicNumberToPrefix(this.bitcoinjsNetwork.bip32.private);
            let reason = '';
            if (providedPrefix !== xpubPrefix && providedPrefix !== xprvPrefix) {
                reason = ` with prefix ${providedPrefix} but expected ${xprvPrefix} or ${xpubPrefix}`;
            }
            else {
                reason = ` (${validateHdKey(config.hdKey, this.bitcoinjsNetwork)})`;
            }
            throw new Error(`Invalid ${this.networkType} hdKey provided to bitcoin payments config${reason}`);
        }
        this.hdNode = deriveHDNode(config.hdKey, this.derivationPath, this.bitcoinjsNetwork);
    }
    isValidXprv(xprv) {
        return isValidXprv(xprv, this.bitcoinjsNetwork);
    }
    isValidXpub(xpub) {
        return isValidXpub(xpub, this.bitcoinjsNetwork);
    }
    getFullConfig() {
        return {
            ...this.config,
            derivationPath: this.derivationPath,
            addressType: this.addressType,
        };
    }
    getPublicConfig() {
        return {
            ...omit(this.getFullConfig(), ['logger', 'server', 'hdKey']),
            hdKey: this.xpub,
        };
    }
    getAccountId(index) {
        return this.xpub;
    }
    getAccountIds() {
        return [this.xpub];
    }
    getAddress(index) {
        return deriveAddress(this.hdNode, index, this.bitcoinjsNetwork, this.addressType);
    }
    getKeyPair(index) {
        if (!this.xprv) {
            throw new Error(`Cannot get private key ${index} - HdBitcoinPayments was created with an xpub`);
        }
        return deriveKeyPair(this.hdNode, index, this.bitcoinjsNetwork);
    }
}
//# sourceMappingURL=HdBitcoinPayments.js.map