import { BaseTronPayments } from './BaseTronPayments';
import { HdTronPaymentsConfig } from './types';
import { generateNewKeys } from './bip44';
import { Payport } from '@faast/payments-common';
export declare class HdTronPayments extends BaseTronPayments<HdTronPaymentsConfig> {
    private readonly config;
    readonly xprv: string | null;
    readonly xpub: string;
    constructor(config: HdTronPaymentsConfig);
    static generateNewKeys: typeof generateNewKeys;
    getXpub(): string;
    getFullConfig(): HdTronPaymentsConfig;
    getPublicConfig(): HdTronPaymentsConfig;
    getAccountId(index: number): string;
    getAccountIds(): string[];
    getPayport(index: number): Promise<Payport>;
    getPrivateKey(index: number): Promise<string>;
}
export default HdTronPayments;
