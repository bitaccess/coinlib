import { HdRipplePaymentsConfig, RippleSignatory } from './types';
import { BaseRipplePayments } from './BaseRipplePayments';
import { generateNewKeys } from './bip44';
export declare class HdRipplePayments extends BaseRipplePayments<HdRipplePaymentsConfig> {
    readonly xprv: string | null;
    readonly xpub: string;
    readonly hotSignatory: RippleSignatory;
    readonly depositSignatory: RippleSignatory;
    constructor(config: HdRipplePaymentsConfig);
    static generateNewKeys: typeof generateNewKeys;
    isReadOnly(): boolean;
    getPublicConfig(): {
        hdKey: string;
        network?: import("@faast/payments-common").NetworkType | undefined;
        logger?: import("@faast/ts-common").Logger | undefined;
        server?: string | import("ripple-lib/dist/npm/api").RippleAPI | null | undefined;
        maxLedgerVersionOffset?: number | undefined;
    };
    getAccountIds(): string[];
    getAccountId(index: number): string;
    getHotSignatory(): RippleSignatory;
    getDepositSignatory(): RippleSignatory;
}
