import { BaseEthereumPayments } from './BaseEthereumPayments';
import { KeyPairEthereumPaymentsConfig } from './types';
import { Payport } from '@faast/payments-common';
export declare class KeyPairEthereumPayments extends BaseEthereumPayments<KeyPairEthereumPaymentsConfig> {
    readonly addresses: {
        [index: number]: string | undefined;
    };
    readonly privateKeys: {
        [index: number]: string | null | undefined;
    };
    readonly addressIndices: {
        [address: string]: number | undefined;
    };
    constructor(config: KeyPairEthereumPaymentsConfig);
    getPublicConfig(): KeyPairEthereumPaymentsConfig;
    getAccountId(index: number): string;
    getAccountIds(): string[];
    getPayport(index: number): Promise<Payport>;
    getPrivateKey(index: number): Promise<string>;
}
export default KeyPairEthereumPayments;
