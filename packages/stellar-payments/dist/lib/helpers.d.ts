declare const toMainDenominationBigNumber: (baseNumeric: string | number | import("bignumber.js").BigNumber) => import("bignumber.js").BigNumber, toMainDenominationString: (baseNumeric: string | number | import("bignumber.js").BigNumber) => string, toMainDenominationNumber: (baseNumeric: string | number | import("bignumber.js").BigNumber) => number, toBaseDenominationBigNumber: (mainNumeric: string | number | import("bignumber.js").BigNumber) => import("bignumber.js").BigNumber, toBaseDenominationString: (mainNumeric: string | number | import("bignumber.js").BigNumber) => string, toBaseDenominationNumber: (mainNumeric: string | number | import("bignumber.js").BigNumber) => number;
export { toMainDenominationBigNumber, toMainDenominationString, toMainDenominationNumber, toBaseDenominationBigNumber, toBaseDenominationString, toBaseDenominationNumber, };
export declare function isValidAddress(address: unknown): boolean;
export declare function isValidExtraId(extraId: unknown): boolean;
export declare function isValidSecret(secret: unknown): boolean;
export declare function assertValidAddress(address: string): void;
export declare function assertValidExtraId(extraId: string): void;
export declare function assertValidExtraIdOrNil(extraId?: string | undefined | null): void;
