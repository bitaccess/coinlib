declare const toMainDenominationBigNumber: (baseNumeric: string | number | import("bignumber.js").BigNumber) => import("bignumber.js").BigNumber, toMainDenominationString: (baseNumeric: string | number | import("bignumber.js").BigNumber) => string, toMainDenominationNumber: (baseNumeric: string | number | import("bignumber.js").BigNumber) => number, toBaseDenominationBigNumber: (mainNumeric: string | number | import("bignumber.js").BigNumber) => import("bignumber.js").BigNumber, toBaseDenominationString: (mainNumeric: string | number | import("bignumber.js").BigNumber) => string, toBaseDenominationNumber: (mainNumeric: string | number | import("bignumber.js").BigNumber) => number;
export { toMainDenominationBigNumber, toMainDenominationString, toMainDenominationNumber, toBaseDenominationBigNumber, toBaseDenominationString, toBaseDenominationNumber, };
export declare function isValidXprv(xprv: string): boolean;
export declare function isValidXpub(xpub: string): boolean;
export declare function isValidAddress(address: string): boolean;
export declare function isValidExtraId(extraId: string): boolean;
export declare function isValidPrivateKey(privateKey: string): boolean;
export declare function privateKeyToAddress(privateKey: string): string;
