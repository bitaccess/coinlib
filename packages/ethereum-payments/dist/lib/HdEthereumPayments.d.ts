import { BaseEthereumPayments } from './BaseEthereumPayments';
import { HdEthereumPaymentsConfig, EthereumSignatory } from './types';
import { Payport } from '@faast/payments-common';
export declare class HdEthereumPayments extends BaseEthereumPayments<HdEthereumPaymentsConfig> {
    readonly xprv: string | null;
    readonly xpub: string;
    constructor(config: HdEthereumPaymentsConfig);
    static generateNewKeys(): EthereumSignatory;
    getXpub(): string;
    getPublicConfig(): HdEthereumPaymentsConfig;
    getAccountId(index: number): string;
    getAccountIds(): string[];
    getPayport(index: number): Promise<Payport>;
    getPrivateKey(index: number): Promise<string>;
}
export default HdEthereumPayments;
