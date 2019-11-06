declare const toMainDenominationBigNumber: (baseNumeric: string | number | import("bignumber.js").default) => import("bignumber.js").default, toMainDenominationString: (baseNumeric: string | number | import("bignumber.js").default) => string, toMainDenominationNumber: (baseNumeric: string | number | import("bignumber.js").default) => number, toBaseDenominationBigNumber: (mainNumeric: string | number | import("bignumber.js").default) => import("bignumber.js").default, toBaseDenominationString: (mainNumeric: string | number | import("bignumber.js").default) => string, toBaseDenominationNumber: (mainNumeric: string | number | import("bignumber.js").default) => number;
export { toMainDenominationBigNumber, toMainDenominationString, toMainDenominationNumber, toBaseDenominationBigNumber, toBaseDenominationString, toBaseDenominationNumber, };
export declare function isValidXprv(xprv: unknown): boolean;
export declare function isValidXpub(xpub: unknown): boolean;
export declare function isValidAddress(address: unknown): boolean;
export declare function isValidExtraId(extraId: unknown): boolean;
export declare function assertValidAddress(address: string): void;
export declare function assertValidExtraId(extraId: string): void;
export declare function assertValidExtraIdOrNil(extraId?: string | undefined | null): void;
