import { BaseTronPayments } from './BaseTronPayments';
import { GetAddressOptions, HdTronPaymentsConfig } from './types';
export declare class HdTronPayments extends BaseTronPayments {
    _config: HdTronPaymentsConfig;
    hdKey: string;
    maxAddressScan: number;
    constructor(config: HdTronPaymentsConfig);
    static generateNewKeys(): {
        xprv: string;
        xpub: string;
    };
    getXpub(): string;
    getFullConfig(): HdTronPaymentsConfig;
    getPublicConfig(): HdTronPaymentsConfig;
    getAddress(index: number, options?: GetAddressOptions): Promise<string>;
    getAddressIndex(address: string): Promise<number>;
    getPrivateKey(index: number): Promise<string>;
}
export default HdTronPayments;
