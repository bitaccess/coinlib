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
    getPublicAccountConfig(): {
        hdKey: string;
    };
    getAccountIds(): string[];
    getAccountId(index: number): string;
    getHotSignatory(): RippleSignatory;
    getDepositSignatory(): RippleSignatory;
}
