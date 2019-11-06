declare const toMainDenominationBigNumber: (baseNumeric: string | number | import("bignumber.js").default) => import("bignumber.js").default, toMainDenominationString: (baseNumeric: string | number | import("bignumber.js").default) => string, toMainDenominationNumber: (baseNumeric: string | number | import("bignumber.js").default) => number, toBaseDenominationBigNumber: (mainNumeric: string | number | import("bignumber.js").default) => import("bignumber.js").default, toBaseDenominationString: (mainNumeric: string | number | import("bignumber.js").default) => string, toBaseDenominationNumber: (mainNumeric: string | number | import("bignumber.js").default) => number;
export { toMainDenominationBigNumber, toMainDenominationString, toMainDenominationNumber, toBaseDenominationBigNumber, toBaseDenominationString, toBaseDenominationNumber, };
export declare function isValidXprv(xprv: string): boolean;
export declare function isValidXpub(xpub: string): boolean;
export declare function isValidAddress(address: string): boolean;
export declare function isValidExtraId(extraId: string): boolean;
export declare function isValidPrivateKey(privateKey: string): boolean;
export declare function privateKeyToAddress(privateKey: string): string;
