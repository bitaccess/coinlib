import BigNumber from 'bignumber.js';
export declare function createUnitConverters(decimals: number): {
    toMainDenominationBigNumber: (baseNumeric: string | number | BigNumber) => BigNumber;
    toMainDenominationNumber: (baseNumeric: string | number | BigNumber) => number;
    toMainDenominationString: (baseNumeric: string | number | BigNumber) => string;
    toBaseDenominationBigNumber: (mainNumeric: string | number | BigNumber) => BigNumber;
    toBaseDenominationNumber: (mainNumeric: string | number | BigNumber) => number;
    toBaseDenominationString: (mainNumeric: string | number | BigNumber) => string;
};
