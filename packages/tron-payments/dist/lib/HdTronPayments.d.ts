import { BaseTronPayments } from './BaseTronPayments';
import { HdTronPaymentsConfig, GetPayportOptions } from './types';
import { Payport } from '@faast/payments-common';
export declare class HdTronPayments extends BaseTronPayments<HdTronPaymentsConfig> {
    private readonly config;
    readonly xprv: string | null;
    readonly xpub: string;
    constructor(config: HdTronPaymentsConfig);
    static generateNewKeys(): {
        xprv: string;
        xpub: string;
    };
    getXpub(): string;
    getFullConfig(): HdTronPaymentsConfig;
    getPublicConfig(): HdTronPaymentsConfig;
    getAccountId(index: number): string;
    getAccountIds(): string[];
    getPayport(index: number, options?: GetPayportOptions): Promise<Payport>;
    getPrivateKey(index: number): Promise<string>;
}
export default HdTronPayments;
