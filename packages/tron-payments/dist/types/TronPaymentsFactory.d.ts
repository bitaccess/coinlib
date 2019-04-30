import { PaymentsFactory } from '@faast/payments-common';
import { TronPaymentsConfig } from './types';
import { HdTronPayments } from './HdTronPayments';
import { KeyPairTronPayments } from './KeyPairTronPayments';
import BaseTronPayments from './BaseTronPayments';
export declare class TronPaymentsFactory implements PaymentsFactory<BaseTronPayments> {
    forConfig(config: TronPaymentsConfig): HdTronPayments | KeyPairTronPayments;
}
export default TronPaymentsFactory;
