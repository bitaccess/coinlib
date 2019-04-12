import { BaseTronPayments, BaseTronPaymentsConfig } from './BaseTronPayments';
import { GetAddressOptions } from './types';
export interface HdTronPaymentsConfig extends BaseTronPaymentsConfig {
    hdKey: string;
    maxAddressScan?: number;
}
export declare class HdTronPayments extends BaseTronPayments {
    hdKey: string;
    maxAddressScan: number;
    constructor(config: HdTronPaymentsConfig);
    static generateNewKeys(): {
        xprv: string;
        xpub: string;
    };
    getXpub(): string;
    getAddress(index: number, options?: GetAddressOptions): Promise<string>;
    getAddressIndex(address: string): Promise<number>;
    getPrivateKey(index: number): Promise<string>;
}
