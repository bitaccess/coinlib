import { HDNode } from './bip44';
import { HdBitcoinPaymentsConfig } from './types';
import { SinglesigBitcoinPayments } from './SinglesigBitcoinPayments';
export declare class HdBitcoinPayments extends SinglesigBitcoinPayments<HdBitcoinPaymentsConfig> {
    private config;
    readonly derivationPath: string;
    readonly xpub: string;
    readonly xprv: string | null;
    readonly hdNode: HDNode;
    constructor(config: HdBitcoinPaymentsConfig);
    isValidXprv(xprv: string): boolean;
    isValidXpub(xpub: string): boolean;
    getFullConfig(): HdBitcoinPaymentsConfig;
    getPublicConfig(): HdBitcoinPaymentsConfig;
    getAccountId(index: number): string;
    getAccountIds(index?: number): string[];
    getAddress(index: number): string;
    getKeyPair(index: number): import("./types").BitcoinjsKeyPair;
}
