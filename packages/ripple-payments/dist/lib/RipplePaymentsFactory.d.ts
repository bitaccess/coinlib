import { PaymentsFactory } from '@faast/payments-common';
import { RipplePaymentsConfig, HdRipplePaymentsConfig, AccountRipplePaymentsConfig } from './types';
import { HdRipplePayments } from './HdRipplePayments';
import { AccountRipplePayments } from './AccountRipplePayments';
export declare class RipplePaymentsFactory implements PaymentsFactory<RipplePaymentsConfig> {
    forConfig(config: HdRipplePaymentsConfig): HdRipplePayments;
    forConfig(config: AccountRipplePaymentsConfig): AccountRipplePayments;
}
export default RipplePaymentsFactory;
