import { BaseTronPayments, BaseTronPaymentsConfig } from './BaseTronPayments';
export interface KeyPairTronPaymentsConfig extends BaseTronPaymentsConfig {
    keyPairs: Array<string | null | undefined> | {
        [index: number]: string;
    };
}
export declare class KeyPairTronPayments extends BaseTronPayments {
    addresses: {
        [index: number]: string | undefined;
    };
    privateKeys: {
        [index: number]: string | null | undefined;
    };
    addressIndices: {
        [address: string]: number | undefined;
    };
    constructor(config: KeyPairTronPaymentsConfig);
    getAddress(index: number): Promise<string>;
    getAddressIndex(address: string): Promise<number>;
    getPrivateKey(index: number): Promise<string>;
}
export default KeyPairTronPayments;
