/// <reference types="node" />
import { BitcoinjsNetwork, AddressType } from './types';
declare const toMainDenominationBigNumber: (baseNumeric: string | number | import("bignumber.js").default) => import("bignumber.js").default, toMainDenominationString: (baseNumeric: string | number | import("bignumber.js").default) => string, toMainDenominationNumber: (baseNumeric: string | number | import("bignumber.js").default) => number, toBaseDenominationBigNumber: (mainNumeric: string | number | import("bignumber.js").default) => import("bignumber.js").default, toBaseDenominationString: (mainNumeric: string | number | import("bignumber.js").default) => string, toBaseDenominationNumber: (mainNumeric: string | number | import("bignumber.js").default) => number;
export { toMainDenominationBigNumber, toMainDenominationString, toMainDenominationNumber, toBaseDenominationBigNumber, toBaseDenominationString, toBaseDenominationNumber, };
export declare function isValidXprv(xprv: string, network: BitcoinjsNetwork): boolean;
export declare function isValidXpub(xpub: string, network: BitcoinjsNetwork): boolean;
export declare function validateHdKey(hdKey: string, network: BitcoinjsNetwork): string | undefined;
export declare function isValidAddress(address: string, network: BitcoinjsNetwork): boolean;
export declare function isValidExtraId(extraId: string): boolean;
export declare function publicKeyToAddress(publicKey: Buffer, network: BitcoinjsNetwork, addressType: AddressType): string;
export declare function privateKeyToAddress(privateKey: string, network: BitcoinjsNetwork, addressType: AddressType): string;
export declare function isValidPrivateKey(privateKey: string, network: BitcoinjsNetwork): boolean;
