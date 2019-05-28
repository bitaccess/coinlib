import { BaseTronPayments } from './BaseTronPayments';
import { GetAddressOptions, HdTronPaymentsConfig } from './types';
export declare class HdTronPayments extends BaseTronPayments<HdTronPaymentsConfig> {
    private readonly config;
    readonly xprv: string | null;
    readonly xpub: string;
    maxAddressScan: number;
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
    getAddress(index: number, options?: GetAddressOptions): Promise<string>;
    getAddressIndex(address: string): Promise<number>;
    getPrivateKey(index: number): Promise<string>;
}
export default HdTronPayments;
