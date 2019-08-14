import { BaseTronPayments } from './BaseTronPayments';
import { KeyPairTronPaymentsConfig } from './types';
import { Payport } from '@faast/payments-common';
export declare class KeyPairTronPayments extends BaseTronPayments<KeyPairTronPaymentsConfig> {
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
    getAccountId(index: number): string;
    getAccountIds(): string[];
    getPayport(index: number): Promise<Payport>;
    getPrivateKey(index: number): Promise<string>;
}
export default KeyPairTronPayments;
