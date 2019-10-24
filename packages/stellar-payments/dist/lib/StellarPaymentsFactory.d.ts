import { PaymentsFactory } from '@faast/payments-common';
import { StellarPaymentsConfig, HdStellarPaymentsConfig, AccountStellarPaymentsConfig } from './types';
import { HdStellarPayments } from './HdStellarPayments';
import { AccountStellarPayments } from './AccountStellarPayments';
export declare class StellarPaymentsFactory implements PaymentsFactory<StellarPaymentsConfig> {
    forConfig(config: HdStellarPaymentsConfig): HdStellarPayments;
    forConfig(config: AccountStellarPaymentsConfig): AccountStellarPayments;
}
export default StellarPaymentsFactory;
