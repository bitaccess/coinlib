import { PaymentsFactory } from '@faast/payments-common';
import { HdTronPaymentsConfig, KeyPairTronPaymentsConfig } from './types';
import { HdTronPayments } from './HdTronPayments';
import { KeyPairTronPayments } from './KeyPairTronPayments';
export declare class TronPaymentsFactory implements PaymentsFactory {
    forConfig(config: HdTronPaymentsConfig): HdTronPayments;
    forConfig(config: KeyPairTronPaymentsConfig): KeyPairTronPayments;
}
export default TronPaymentsFactory;
