import { HDNode } from './bip44';
import { HdBitcoinPaymentsConfig } from './types';
import { BaseBitcoinPayments } from './BaseBitcoinPayments';
export declare class HdBitcoinPayments extends BaseBitcoinPayments<HdBitcoinPaymentsConfig> {
    config: HdBitcoinPaymentsConfig;
    readonly derivationPath: string;
    readonly xpub: string;
    readonly xprv: string | null;
    readonly hdNode: HDNode;
    constructor(config: HdBitcoinPaymentsConfig);
    isValidXprv(xprv: string): boolean;
    isValidXpub(xpub: string): boolean;
    getFullConfig(): {
        derivationPath: string;
        addressType: import("./types").AddressType;
        network?: import("@faast/payments-common").NetworkType | undefined;
        logger?: import("@faast/ts-common").Logger | undefined;
        server?: string | import("./types").BlockbookServerAPI | string[] | null | undefined;
        minTxFee?: {
            feeRate: string;
            feeRateType: import("@faast/payments-common").FeeRateType;
        } | undefined;
        dustThreshold?: number | undefined;
        networkMinRelayFee?: number | undefined;
        targetUtxoPoolSize?: number | undefined;
        minChange?: string | undefined;
        hdKey: string;
    };
    getPublicConfig(): {
        hdKey: string;
        network?: import("@faast/payments-common").NetworkType | undefined;
        addressType: import("./types").AddressType;
        minTxFee?: {
            feeRate: string;
            feeRateType: import("@faast/payments-common").FeeRateType;
        } | undefined;
        dustThreshold?: number | undefined;
        networkMinRelayFee?: number | undefined;
        targetUtxoPoolSize?: number | undefined;
        minChange?: string | undefined;
        derivationPath: string;
    };
    getAccountId(index: number): string;
    getAccountIds(): string[];
    getAddress(index: number): string;
    getKeyPair(index: number): import("./bip44").KeyPair;
}
