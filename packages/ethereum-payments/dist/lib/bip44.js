import { pubToAddress } from 'ethereumjs-util';
import { fromBase58, fromSeed } from 'bip32';
import crypto from 'crypto';
import { ec as EC } from 'elliptic';
const ec = new EC('secp256k1');
class EthereumBIP44 {
    constructor(hdKey) {
        this.parts = [
            'm',
            "44'",
            "60'",
            "0'",
            '0'
        ];
        this.key = hdKey;
    }
    static fromExtKey(xkey) {
        if (['xprv', 'xpub'].includes(xkey.substring(0, 4))) {
            return new EthereumBIP44(fromBase58(xkey));
        }
        throw new Error('Not extended key');
    }
    getAddress(index) {
        const derived = this.deriveByIndex(index);
        let address = pubToAddress(derived.publicKey, true);
        return `0x${address.toString('hex')}`;
    }
    getPrivateKey(index) {
        const derived = this.deriveByIndex(index);
        if (!derived.privateKey) {
            return '';
        }
        return `0x${derived.privateKey.toString('hex')}`;
    }
    getPublicKey(index) {
        return this.deriveByIndex(index).publicKey.toString('hex');
    }
    getXPrivateKey(index) {
        const key = this.deriveByIndex(index).toBase58();
        return key.substring(0, 4) === 'xpub' ? '' : key;
    }
    getXPublicKey(index) {
        return this.deriveByIndex(index).neutered().toBase58();
    }
    deriveByIndex(index) {
        if (typeof index === 'undefined') {
            return this.key;
        }
        const path = this.parts.slice(this.key.depth);
        const keyPath = path.length > 0 ? path.join('/') + '/' : '';
        return this.key.derivePath(`${keyPath}${index.toString()}`);
    }
}
export function deriveSignatory(xkey, index) {
    const wallet = xkey ?
        EthereumBIP44.fromExtKey(xkey) :
        EthereumBIP44.fromExtKey(fromSeed(crypto.randomBytes(32)).toBase58());
    return {
        address: wallet.getAddress(index),
        keys: {
            prv: wallet.getPrivateKey(index) || '',
            pub: wallet.getPublicKey(index),
        },
        xkeys: {
            xprv: wallet.getXPrivateKey(index) || '',
            xpub: wallet.getXPublicKey(index),
        }
    };
}
export function isValidXkey(key) {
    try {
        EthereumBIP44.fromExtKey(key);
        return true;
    }
    catch (e) {
        return false;
    }
}
//# sourceMappingURL=bip44.js.map