import { BIP32Interface as HDNode } from 'bip32';
export declare const derivationPath = "m/44'/195'/0'";
export declare function deriveAddress(xpub: string, index: number): string;
export declare function derivePrivateKey(xprv: string, index: number): string;
export declare function xprvToXpub(xprv: string | HDNode): string;
export declare function generateNewKeys(): {
    xpub: string;
    xprv: string;
};
