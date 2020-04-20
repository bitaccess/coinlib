import { BIP32Interface as HDNode } from 'bip32';
import { BitcoinjsNetwork, SinglesigAddressType, BitcoinjsKeyPair } from './types';
export { HDNode };
export declare function splitDerivationPath(path: string): string[];
export declare function deriveHDNode(hdKey: string, derivationPath: string, network: BitcoinjsNetwork): HDNode;
export declare function deriveKeyPair(baseNode: HDNode, index: number, network: BitcoinjsNetwork): BitcoinjsKeyPair;
export declare function deriveAddress(baseNode: HDNode, index: number, network: BitcoinjsNetwork, addressType: SinglesigAddressType): string;
export declare function derivePrivateKey(baseNode: HDNode, index: number, network: BitcoinjsNetwork): string;
export declare function xprvToXpub(xprv: string, derivationPath: string, network: BitcoinjsNetwork): string;
