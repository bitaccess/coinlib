import { AccountRipplePaymentsConfig, RippleSignatory, RippleAccountConfig } from './types';
import { BaseRipplePayments } from './BaseRipplePayments';
export declare class AccountRipplePayments extends BaseRipplePayments<AccountRipplePaymentsConfig> {
    readOnly: boolean;
    readonly hotSignatory: RippleSignatory;
    readonly depositSignatory: RippleSignatory;
    constructor(config: AccountRipplePaymentsConfig);
    accountConfigToSignatory(accountConfig: RippleAccountConfig): RippleSignatory;
    isReadOnly(): boolean;
    getPublicAccountConfig(): AccountRipplePaymentsConfig;
    getAccountIds(): string[];
    getAccountId(index: number): string;
    getHotSignatory(): RippleSignatory;
    getDepositSignatory(): RippleSignatory;
}
