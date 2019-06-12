import { HDPrivateKey } from 'bitcore-lib';
export declare const derivationPath = "m/44'/195'/0'";
export declare function deriveAddress(xpub: string, index: number): string;
export declare function derivePrivateKey(xprv: string, index: number): string;
export declare function xprvToXpub(xprv: string | HDPrivateKey): string;
