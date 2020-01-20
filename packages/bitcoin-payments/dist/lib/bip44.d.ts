/// <reference types="node" />
import { ECPair } from 'bitcoinjs-lib';
import { BIP32Interface as HDNode } from 'bip32';
import { BitcoinjsNetwork, AddressType } from './types';
export { HDNode };
export declare type KeyPair = ECPair.Signer & {
    privateKey?: Buffer | undefined;
    toWIF(): string;
};
export declare function splitDerivationPath(path: string): string[];
export declare function deriveHDNode(hdKey: string, derivationPath: string, network: BitcoinjsNetwork): HDNode;
export declare function deriveKeyPair(baseNode: HDNode, index: number, network: BitcoinjsNetwork): KeyPair;
export declare function deriveAddress(baseNode: HDNode, index: number, network: BitcoinjsNetwork, addressType: AddressType): string;
export declare function derivePrivateKey(baseNode: HDNode, index: number, network: BitcoinjsNetwork): string;
export declare function xprvToXpub(xprv: string, derivationPath: string, network: BitcoinjsNetwork): string;
