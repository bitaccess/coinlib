import { AccountStellarPaymentsConfig, StellarSignatory, StellarAccountConfig } from './types';
import { BaseStellarPayments } from './BaseStellarPayments';
export declare class AccountStellarPayments extends BaseStellarPayments<AccountStellarPaymentsConfig> {
    readOnly: boolean;
    readonly hotSignatory: StellarSignatory;
    readonly depositSignatory: StellarSignatory;
    constructor(config: AccountStellarPaymentsConfig);
    accountConfigToSignatory(accountConfig: StellarAccountConfig): StellarSignatory;
    isReadOnly(): boolean;
    getPublicAccountConfig(): AccountStellarPaymentsConfig;
    getAccountIds(): string[];
    getAccountId(index: number): string;
    getHotSignatory(): {
        address: string;
        secret: string;
    };
    getDepositSignatory(): {
        address: string;
        secret: string;
    };
}
