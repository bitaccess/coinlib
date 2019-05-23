import { BaseTronPayments } from './BaseTronPayments';
import { KeyPairTronPaymentsConfig } from './types';
export declare class KeyPairTronPayments extends BaseTronPayments {
    _config: KeyPairTronPaymentsConfig;
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
    getFullConfig(): KeyPairTronPaymentsConfig;
    getPublicConfig(): KeyPairTronPaymentsConfig;
    getAddress(index: number): Promise<string>;
    getAddressIndex(address: string): Promise<number>;
    getPrivateKey(index: number): Promise<string>;
}
export default KeyPairTronPayments;
