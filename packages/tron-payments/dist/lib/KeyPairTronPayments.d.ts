import { BaseTronPayments } from './BaseTronPayments';
import { KeyPairTronPaymentsConfig } from './types';
export declare class KeyPairTronPayments extends BaseTronPayments {
    private readonly config;
    readonly addresses: {
        [index: number]: string | undefined;
    };
    readonly privateKeys: {
        [index: number]: string | null | undefined;
    };
    readonly addressIndices: {
        [address: string]: number | undefined;
    };
    constructor(config: KeyPairTronPaymentsConfig);
    getFullConfig(): KeyPairTronPaymentsConfig;
    getPublicConfig(): KeyPairTronPaymentsConfig;
    getAccountIds(): string[];
    getAddress(index: number): Promise<string>;
    getAddressIndex(address: string): Promise<number>;
    getPrivateKey(index: number): Promise<string>;
}
export default KeyPairTronPayments;
